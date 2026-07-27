import { useEffect } from "react";
import { type ViewStyle } from "react-native";
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useReduceMotion } from "@/lib/a11y";

/**
 * Reanimated 4 infers `DefaultStyle` (View | Text | Image) from a bare
 * useAnimatedStyle call, and that union no longer assigns to Animated.View's
 * style prop. Passing ViewStyle as the explicit generic keeps both pills typed.
 */
type AnimatedViewStyle = ReturnType<typeof useAnimatedStyle<ViewStyle>>;

/**
 * The "gooey" counter bump — the liquid squash-and-settle used by the streak
 * and coin pills whenever their value goes UP.
 *
 * The reference is the metaball/blob morph messengers use when two circular
 * buttons fuse: a shape stretches, pinches, then wobbles back to rest. The
 * literal technique (heavy Gaussian blur + an alpha threshold via
 * feColorMatrix) can't be reproduced here — RN's SVG filters can't composite
 * live RN subviews and behave differently on iOS vs Android. At pill scale the
 * blob read comes almost entirely from the TIMING and the non-uniform scale,
 * so this rebuilds it with UI-thread transforms instead:
 *
 *   1. anticipation — a fast squat (wider, shorter), like the blob loading up
 *   2. stretch      — overshoot tall and narrow, the "pinch" of the neck
 *   3. settle       — a low-damping spring that wobbles back to 1
 *
 * Non-uniform x/y scale is what separates this from a plain pop: a uniform
 * bump reads as "button pressed", squash-and-stretch reads as "liquid".
 *
 * Decreases are deliberately silent — spending coins shouldn't celebrate.
 */

/** Peak horizontal/vertical scale at each phase. Tuned for a ~32pt pill. */
const SQUAT_X = 1.14;
const SQUAT_Y = 0.9;
const STRETCH_X = 0.94;
const STRETCH_Y = 1.16;

/**
 * Last value seen per counter, kept at MODULE scope — deliberately outside
 * React.
 *
 * The pills live in `headerRight` of a native react-native-screens header.
 * Screen.tsx sets that via navigation.setOptions in an effect keyed on
 * `trailing`, and Home rebuilds that JSX element every render, so a coin/streak
 * change re-runs setOptions and react-native-screens tears down and rebuilds
 * the native header subtree. The pill therefore UNMOUNTS and REMOUNTS on the
 * very render that changes the number.
 *
 * A useRef baseline cannot survive that: the remounted component re-seeds
 * `prev` to the NEW value, sees no increase, and never animates — the number
 * just snaps. Module scope outlives the remount, so the fresh instance still
 * sees the old value and plays the bump.
 */
const lastSeen = new Map<string, number>();

/**
 * Reads the stored baseline and updates it. Returns whether `value` is an
 * increase over what was last seen — false on the first ever call, so a cold
 * launch with an existing balance stays silent.
 */
function isIncrease(key: string, value: number): boolean {
  const seen = lastSeen.get(key);
  lastSeen.set(key, value);
  return seen != null && value > seen;
}

export type GooeyBump = {
  /** Spread onto the Animated.View that paints the pill background. */
  style: AnimatedViewStyle;
  /** Fire the bump manually (e.g. a claim confirmation, not a value change). */
  bump: () => void;
};

/**
 * Watches `value` and animates on every increase.
 *
 * @param value   the counter to track (coins, streak days)
 * @param key     stable id for this counter ("coins", "streak"). Names the
 *                module-scope baseline that survives the header remount, so it
 *                must be the SAME string across every render site of a given
 *                counter and DIFFERENT between counters.
 * @param enabled set false to suppress the animation entirely
 */
export function useGooeyBump(value: number, key: string, enabled = true): GooeyBump {
  const reduceMotion = useReduceMotion();
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);

  const bump = () => {
    if (reduceMotion) return;
    sx.value = withSequence(
      withTiming(SQUAT_X, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(STRETCH_X, { duration: 110, easing: Easing.inOut(Easing.quad) }),
      withSpring(1, { damping: 7, stiffness: 190, mass: 0.55 })
    );
    // The vertical track runs on the same clock but is phase-inverted — as the
    // pill widens it must flatten, or the two axes cancel into a uniform pop.
    sy.value = withSequence(
      withTiming(SQUAT_Y, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(STRETCH_Y, { duration: 110, easing: Easing.inOut(Easing.quad) }),
      withSpring(1, { damping: 7, stiffness: 190, mass: 0.55 })
    );
  };

  // Runs on MOUNT as well as on value change — because the header remount means
  // the "value changed" render and the "fresh mount" render are the same event.
  // isIncrease() consults the module-scope baseline, so this fires exactly once
  // per real increase no matter how many times the pill is torn down.
  useEffect(() => {
    if (enabled && isIncrease(key, value)) bump();
    // `bump` only closes over shared values and the reduce-motion flag, both
    // read at call time, so it doesn't need to be a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, key, enabled, reduceMotion]);

  const style = useAnimatedStyle<ViewStyle>(() => ({
    transform: [{ scaleX: sx.value }, { scaleY: sy.value }],
  }));

  return { style, bump };
}

/**
 * Mount-in transition for a header control.
 *
 * The pills live in the native header, and each screen supplies its own
 * `headerRight`. Switching tabs therefore doesn't move a shared view — Home's
 * island is destroyed and Pets' is built from scratch — so the pills HARD-CUT
 * in and out with no transition. Nothing outside the native header can tween
 * across that boundary, which is why the DEPARTURE can't be animated at all:
 * the old header is already gone by the time the new one mounts.
 *
 * The arrival is reachable, though, and that's where the polish goes. Each
 * control springs in from slightly small and low, and `index` staggers them so
 * they cascade left-to-right instead of the island appearing as one flat block
 * — the part that reads as "designed" rather than "popped into existence".
 *
 * @param index position in the island (0 = leftmost), for the stagger delay
 * @param enabled false to mount already in place, no entrance. HeaderActions
 *                passes false for controls the PREVIOUS island also had: those
 *                are meant to look like they never left, so the only motion the
 *                eye catches is the island resizing around them.
 */
export function useHeaderPillEntrance(index = 0, enabled = true): AnimatedViewStyle {
  const reduceMotion = useReduceMotion();
  const t = useSharedValue(reduceMotion || !enabled ? 1 : 0);

  useEffect(() => {
    if (reduceMotion || !enabled) {
      t.value = 1;
      return;
    }
    // Re-seeded on every mount: a tab switch builds a fresh island, so this is
    // the one hook here that SHOULD replay each time it appears.
    t.value = 0;
    t.value = withDelay(
      index * STAGGER_MS,
      // Spring, not timing — the slight overshoot is what makes the pill feel
      // like it lands rather than merely fading up.
      withSpring(1, { damping: 14, stiffness: 220, mass: 0.6 })
    );
  }, [reduceMotion, index, enabled, t]);

  return useAnimatedStyle<ViewStyle>(() => ({
    opacity: Math.min(1, t.value * 1.6),
    // Small offsets only — a large translate would push the control outside the
    // header bar's bounds, which UIKit clips (see the HeaderBackButton note in
    // components/Screen.tsx).
    transform: [{ translateY: (1 - t.value) * 8 }, { scale: 0.8 + t.value * 0.2 }],
  }));
}

/** Per-control delay in the island's cascade. */
const STAGGER_MS = 45;

/**
 * Companion glow for the bump — a soft halo that blooms behind the pill and
 * fades out. This is the part that most sells "something was earned"; the
 * transform alone can read as a glitch on a small pill.
 *
 * Kept separate from useGooeyBump so a caller can take the motion without the
 * glow (or drive the glow from a different trigger).
 */
export function useGooeyGlow(value: number, key: string, enabled = true) {
  const reduceMotion = useReduceMotion();
  const glow = useSharedValue(0);

  // Own baseline entry (":glow" suffix): isIncrease() consumes the value it
  // reads, so sharing a key with useGooeyBump would let whichever hook ran
  // first swallow the increase and leave the other silent.
  useEffect(() => {
    if (enabled && !reduceMotion && isIncrease(`${key}:glow`, value)) {
      glow.value = withSequence(
        withTiming(1, { duration: 130, easing: Easing.out(Easing.quad) }),
        // Held briefly at full so the halo is legible before it decays —
        // without the hold it flickers at 60fps and reads as a rendering bug.
        withDelay(90, withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) }))
      );
    }
  }, [value, key, enabled, reduceMotion, glow]);

  const style = useAnimatedStyle<ViewStyle>(() => ({
    opacity: glow.value * 0.55,
    transform: [{ scale: 1 + glow.value * 0.35 }],
  }));

  return style;
}
