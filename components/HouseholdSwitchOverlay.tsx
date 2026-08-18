import PixelSprite from "@/components/pixel/PixelSprite";
import { CAT_SPRITE } from "@/components/pixel/petSprites";
import { useReduceMotion } from "@/lib/a11y";
import { useStore } from "@/lib/store";
import { font, useColors, type Colors } from "@/lib/theme";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const FADE_IN_MS = 140;
const FADE_OUT_MS = 220;
// 16x16 sprite — an integer multiple keeps every sprite pixel on a whole
// device pixel, so the art stays razor-sharp instead of resampling soft.
const MASCOT_SIZE = 128;
// Same shape of motion as PixelPet's IdleWrap on Home (bob + rock), but with
// a much wider sweep: IdleWrap's amplitudes are tuned for small avatar
// badges, where 3% of a 40px sprite is ~1px of travel. On a 128px hero sprite
// that same ratio is ~4px — technically animating, visually static. The pace
// stays slow and unhurried; it's the amplitude that makes it read.
const IDLE_HALF_CYCLE_MS = 800;
const BOB_FRAC = 0.15; // total sweep; ~19px at 128px, ~10px either side of rest
const ROCK_DEG = 10; // total sweep, ±5deg either side of rest
// Determinate progress bar: the store reports real completed stages of the
// load (session, memberships, the four parallel fetches, state committed), so
// the fill tracks actual work rather than sweeping on a timer.
const BAR_WIDTH = 180;
// Each step eases to its new width instead of jumping, so four discrete
// reports still read as continuous motion.
const BAR_STEP_MS = 280;

/**
 * Full-screen cover shown while the store re-hydrates into a DIFFERENT
 * household (switch, join, create, leave, delete).
 *
 * Screens gate their skeletons on `hydrated`, which deliberately stays true
 * across a switch — routing must not bounce and the tab bar must not remount.
 * The consequence is that every screen underneath keeps painting the OUTGOING
 * household's pets, logs and streak for the length of the round trip, which
 * reads as "the switch did nothing" and then jumps. This covers that window
 * instead: opaque (not translucent) so no stale pet name shows through, and
 * mounted above the navigator so it survives whatever screen is on top.
 *
 * Fade-out is driven by a shared value rather than Reanimated's `exiting`
 * prop: this component is conditionally rendered, so returning null on the
 * store flag would unmount the view before any exit animation could play —
 * which is exactly why the overlay used to vanish in a single frame while the
 * fade-IN looked correct. `visible` therefore lags the store flag, staying
 * true until the fade actually finishes.
 */
export default function HouseholdSwitchOverlay() {
  const { switchingHousehold, switchProgress } = useStore();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  // `!== null`, not a falsy check: "" is a legitimate active value (a switch
  // whose destination name we don't know yet).
  const active = switchingHousehold !== null;
  // Keeps the view mounted through the fade-out, after `active` goes false.
  const [visible, setVisible] = useState(active);
  // The last non-null label, held through the fade-out so the text doesn't
  // blank out mid-animation when the store clears the flag.
  const [label, setLabel] = useState(switchingHousehold ?? "");

  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(0);
  // Drives the idle bob/rock. 0..1 with 0.5 as rest, so the sprite is centred
  // on its first frame and swings symmetrically either side of it.
  const idle = useSharedValue(0.5);
  // Mirrors the store's reported progress, eased so each discrete step glides.
  const progress = useSharedValue(0);

  useEffect(() => {
    if (active) {
      setVisible(true);
      if (switchingHousehold) setLabel(switchingHousehold);
      opacity.value = withTiming(1, { duration: FADE_IN_MS, easing: Easing.out(Easing.quad) });
      return;
    }
    // Not active: fade out, then unmount from the animation's own callback so
    // the view survives exactly as long as the animation needs it.
    opacity.value = withTiming(0, { duration: FADE_OUT_MS, easing: Easing.in(Easing.quad) }, (finished) => {
      if (finished) runOnJS(setVisible)(false);
    });
  }, [active, switchingHousehold, opacity]);

  useEffect(() => {
    if (!visible || reduceMotion) return;
    // Settle to one extreme first, then sweep edge-to-edge forever. The
    // `reverse` flag on withRepeat plays each cycle backwards after the
    // forward pass, so it runs 0 -> 1 -> 0 -> 1 continuously with no snap
    // back to the start between cycles.
    idle.value = withSequence(
      withTiming(0, { duration: IDLE_HALF_CYCLE_MS / 2, easing: Easing.inOut(Easing.quad) }),
      withRepeat(withTiming(1, { duration: IDLE_HALF_CYCLE_MS, easing: Easing.inOut(Easing.quad) }), -1, true)
    );
  }, [visible, reduceMotion, idle]);

  useEffect(() => {
    if (!visible) return;
    // Reduce-motion snaps to each reported value rather than easing between
    // them; the bar still conveys the same information either way.
    progress.value = reduceMotion
      ? switchProgress
      : withTiming(switchProgress, { duration: BAR_STEP_MS, easing: Easing.out(Easing.cubic) });
  }, [visible, reduceMotion, switchProgress, progress]);

  // Reset to empty for the NEXT switch, once this one has faded out. Doing it
  // on mount instead would race the first progress report.
  useEffect(() => {
    if (!visible) progress.value = 0;
  }, [visible, progress]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  // Bob + rock, like the pets on Home. Translation/rotation move the whole
  // rendered sprite rather than resampling it the way a scale pulse would, so
  // the pixel art stays crisp however far it travels.
  const mascotStyle = useAnimatedStyle(() => ({
    transform: [
      // Both axes are centred on `idle` = 0.5, so the sprite swings evenly to
      // BOTH sides of rest. Driving translateY off the raw 0..1 (as the
      // original IdleWrap does) only ever moves it one way from its resting
      // position, which reads as a one-directional bob rather than a wobble.
      { translateY: (idle.value - 0.5) * -MASCOT_SIZE * BOB_FRAC },
      { rotate: `${(idle.value - 0.5) * ROCK_DEG}deg` },
    ],
  }));

  const fillStyle = useAnimatedStyle(() => ({ width: BAR_WIDTH * progress.value }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.fill, fadeStyle]}
      // Swallows taps on whatever is underneath while the switch is live: the
      // old household is still in state, and a stray tap there would log care
      // against the household the user is on their way OUT of. Released as
      // soon as the switch settles so the fading overlay doesn't eat the first
      // tap on the NEW household.
      pointerEvents={active ? "auto" : "none"}
      accessibilityViewIsModal={active}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? "yes" : "no-hide-descendants"}
      accessibilityLabel={label ? `Switching to ${label}` : "Switching household"}
    >
      <View style={styles.center}>
        <Animated.View style={[styles.mascot, mascotStyle]}>
          {/* The same mascot the first-run intro screen leads with — a
              familiar face while the new household loads, rather than a
              generic spinner glyph. */}
          <PixelSprite sprite={CAT_SPRITE} size={MASCOT_SIZE} />
        </Animated.View>
        <Text style={styles.title}>{label ? `Switching to ${label}` : "Switching household"}</Text>
        <Text style={styles.subtitle}>Loading pets, care history and reminders…</Text>
        <View
          style={styles.barTrack}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(switchProgress * 100) }}
        >
          <Animated.View style={[styles.barFill, fillStyle]} />
        </View>
      </View>
    </Animated.View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    fill: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.bg, zIndex: 20 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 6 },
    mascot: { marginBottom: 24 },
    barTrack: {
      width: BAR_WIDTH,
      height: 6,
      borderRadius: 999,
      backgroundColor: colors.fill,
      overflow: "hidden",
      marginTop: 20,
    },
    barFill: { height: "100%", borderRadius: 999, backgroundColor: colors.accent },
    title: { fontSize: 17, fontFamily: font.semibold, color: colors.label, textAlign: "center" },
    subtitle: { fontSize: 14, fontFamily: font.regular, color: colors.label2, textAlign: "center" },
  });
