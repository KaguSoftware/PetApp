import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from "react-native";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import NotificationBell from "@/components/NotificationBell";
import SettingsButton from "@/components/SettingsButton";
import { CoinPill } from "@/components/ui";
import { useReduceMotion } from "@/lib/a11y";
import { useStore } from "@/lib/store";
import { useHeaderPillEntrance } from "@/lib/useGooeyBump";

/**
 * The standard top-right header island for every tab: the coin balance (taps
 * through to the coins screen), the notification bell, and the settings gear
 * (Settings isn't a bottom tab — Community took its slot). Kept in one place
 * so the "island" is identical on every tab.
 *
 * CRITICAL — this must render exactly ONE element, never a fragment of
 * siblings. `headerRight` is wrapped in a single UIBarButtonItem, and
 * react-native-screens' header hitTest (RNSScreenStackHeaderConfig.mm) returns
 * on the FIRST left/right subview it finds, so with multiple sibling controls
 * only one ever receives touches — the rest read as dead buttons. One wrapper
 * View keeps every control tappable. Extra items (e.g. Home's streak pill)
 * belong INSIDE this island via `leading`, not beside it.
 *
 * The island is deliberately transparent and gap-free: each control paints its
 * own pill, so the space BETWEEN them is not part of any button. Tapping there
 * used to feel like hitting a dead button; now there is simply nothing to hit.
 *
 * Each control is additionally wrapped in its own Animated.View for the
 * entrance stagger. That's safe for the hitTest rule above — the constraint is
 * on what `headerRight` RETURNS (still exactly one root View); these wrappers
 * are nested inside it, which is where extra items are supposed to live.
 */

/**
 * The island holds a different number of controls per tab — four on Home
 * (streak, coins, bell, gear), three on Pets (coins, bell, gear), two
 * everywhere else — so its WIDTH changes as you move between tabs. The optional
 * slots therefore animate their width open and closed instead of appearing and
 * vanishing, which is what makes the island read as one object that resizes
 * rather than three different islands.
 *
 * See IslandSlot for how that survives the header being torn down and rebuilt
 * on every tab switch.
 */

/** Gap between controls, carried as padding INSIDE each slot (see styles). */
const SLOT_GAP = 8;

/**
 * Width/collapse spring. Nearly critically damped on purpose: overshoot on a
 * width means the neighbouring controls visibly bounce sideways, which reads as
 * a layout glitch rather than as motion design. The bounce in this island comes
 * from the pills themselves (useGooeyBump), not from the container.
 */
const SLOT_SPRING = { damping: 20, stiffness: 200, mass: 0.8 } as const;

/**
 * Natural (uncollapsed) width per slot id, kept at MODULE scope — deliberately
 * outside React, for the same reason `lastSeen` is in lib/useGooeyBump.tsx.
 *
 * A tab switch destroys one island and builds the next, so the island that has
 * to CLOSE the coin slot is a brand-new component instance that has never
 * measured the coin pill. Without a remembered width it would have to render
 * the pill, wait a layout pass, and only then know what to animate away from.
 * Remembering it lets the fresh island start the collapse on frame one.
 */
const naturalWidths = new Map<string, number>();

/**
 * Which slots the previously-mounted island had, and the last `leading` node it
 * was given. Same rationale: the new island needs to know what the old one
 * looked like in order to animate the difference.
 */
let lastSlots = new Set<string>();
let lastLeading: React.ReactNode = null;

/**
 * One optional control in the island, animating between zero width and its
 * natural width.
 *
 * @param id      stable slot name; keys the remembered natural width
 * @param visible whether this island wants the slot
 * @param from    whether the PREVIOUS island had it — the state to animate out
 *                of on mount. When it equals `visible` nothing moves.
 */
function IslandSlot({
  id,
  visible,
  from,
  children,
}: {
  id: string;
  visible: boolean;
  from: boolean;
  children: React.ReactNode;
}) {
  const reduceMotion = useReduceMotion();
  const [width, setWidth] = useState(() => naturalWidths.get(id) ?? 0);
  // A width can only be animated between two known numbers. The first time this
  // slot is ever opened nobody has measured its content yet, so it just lays
  // out — the entrance spring in useHeaderPillEntrance covers that case, and
  // every later open/close animates properly off the remembered width.
  const startsOpen = reduceMotion || width === 0 ? visible : from;
  // Children stay mounted through a close so there is something to collapse;
  // they're dropped only once the spring has settled shut.
  const [shown, setShown] = useState(visible || startsOpen);
  // Clipping is ON only while the width is in motion. Permanently clipping the
  // slot would cut off the coin pill's earn glow, which blooms past its own
  // bounds (see coinGlow in components/ui.tsx).
  const [animating, setAnimating] = useState(() => startsOpen !== visible);
  const t = useSharedValue(startsOpen ? 1 : 0);

  // Render-phase transition, not an effect: by the time an effect could flip
  // these the collapsing child would already have been unmounted (and the
  // still-full-width content drawn unclipped) for one frame.
  const prevVisible = useRef(visible);
  if (prevVisible.current !== visible) {
    prevVisible.current = visible;
    setAnimating(true);
    if (visible) setShown(true);
  }

  const settle = useCallback((open: boolean) => {
    setAnimating(false);
    setShown(open);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      t.value = visible ? 1 : 0;
      settle(visible);
      return;
    }
    t.value = withSpring(visible ? 1 : 0, SLOT_SPRING, (finished) => {
      "worklet";
      if (finished) runOnJS(settle)(visible);
    });
  }, [visible, reduceMotion, settle, t]);

  const style = useAnimatedStyle<ViewStyle>(
    () => ({
      width: width * t.value,
      // Fades faster than it narrows so the content is gone before the clip
      // edge would slice through a glyph.
      opacity: Math.min(1, t.value * 1.6),
    }),
    [width]
  );

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      // The inner view never shrinks (flexShrink: 0), so this is always the
      // NATURAL width, even mid-collapse — and it re-reports when the content
      // itself grows, e.g. a coin balance crossing into another digit.
      const w = e.nativeEvent.layout.width;
      if (w > 0 && Math.abs(w - width) > 0.5) {
        naturalWidths.set(id, w);
        setWidth(w);
      }
    },
    [id, width]
  );

  return (
    <Animated.View
      // Until the first measurement there is nothing to animate to, so the slot
      // lays out naturally for one pass and the animated width takes over after.
      style={[animating && styles.clip, width > 0 ? style : null]}
      pointerEvents={visible ? "auto" : "none"}
    >
      {/* Unmounted rather than emptied when closed: an empty content view would
          still measure its own padding, and that stray width would be recorded
          as this slot's "natural" size and reopened to next time. */}
      {shown ? (
        <View style={styles.slotContent} onLayout={onLayout}>
          {children}
        </View>
      ) : null}
    </Animated.View>
  );
}

export default function HeaderActions({
  leading,
  showCoins = false,
}: {
  leading?: React.ReactNode;
  /** The coin pill is only shown on Home and Pets (where earning/spending
   * happens); everywhere else it's noise, so it defaults to off. */
  showCoins?: boolean;
}) {
  const router = useRouter();
  const { state } = useStore();

  const hasLeading = !!leading;
  const slots = useMemo(() => {
    const s = new Set<string>(["bell", "gear"]);
    if (hasLeading) s.add("leading");
    if (showCoins) s.add("coins");
    return s;
  }, [hasLeading, showCoins]);

  // Snapshot of the island this one replaces, read once at mount.
  const [prev] = useState(() => ({ slots: lastSlots, leading: lastLeading }));
  useEffect(() => {
    lastSlots = slots;
    lastLeading = leading ?? null;
  });

  // To collapse the streak pill on the way OUT of Home we have to keep drawing
  // it for the length of the animation — but only Home ever passes it, and Home
  // is gone. Re-rendering the previous island's element is safe: it is an inert
  // description, and the slot is pointerEvents="none" the whole time it is
  // closing, so its stale onPress can never fire.
  const leadingNode = leading ?? (prev.slots.has("leading") ? prev.leading : null);

  // Each screen builds its OWN island, so a tab switch destroys one and mounts
  // the next. The departure can't be animated (see useHeaderPillEntrance), so
  // the arrival carries the polish: each control springs in on its own delay,
  // cascading left-to-right rather than the island snapping in as one block.
  //
  // Controls the previous island ALREADY had skip that entrance entirely —
  // they're meant to look like they never left, so that the only visible motion
  // is the island resizing around them. Indices stay dense across the controls
  // that do animate, or the cascade would inherit a gap.
  let slot = 0;
  const entranceIndex = (key: string) => (prev.slots.has(key) ? -1 : slot++);
  const leadingAnim = useHeaderPillEntrance(...pill(entranceIndex("leading")));
  const coinsAnim = useHeaderPillEntrance(...pill(entranceIndex("coins")));
  const bellAnim = useHeaderPillEntrance(...pill(entranceIndex("bell")));
  const gearAnim = useHeaderPillEntrance(...pill(entranceIndex("gear")));
  // The status-bar inset is handled once, at the header level
  // (statusBarTranslucent in nativeHeaderOptions, components/Screen.tsx) —
  // not here, or the offset would be applied twice on Android.
  return (
    <View style={styles.island}>
      <IslandSlot id="leading" visible={hasLeading} from={prev.slots.has("leading")}>
        <Animated.View style={leadingAnim}>{leadingNode}</Animated.View>
      </IslandSlot>
      <IslandSlot id="coins" visible={showCoins} from={prev.slots.has("coins")}>
        <Animated.View style={coinsAnim}>
          <CoinPill amount={state.coins} onPress={() => router.push("/coins")} />
        </Animated.View>
      </IslandSlot>
      <Animated.View style={[styles.slotContent, bellAnim]}>
        <NotificationBell />
      </Animated.View>
      <Animated.View style={gearAnim}>
        <SettingsButton />
      </Animated.View>
    </View>
  );
}

/** `index < 0` means "was already here" — mount it in place, no entrance. */
function pill(index: number): [number, boolean] {
  return [Math.max(0, index), index >= 0];
}

const styles = StyleSheet.create({
  // No `gap` here: a zero-width collapsed slot would still leave its share of
  // the gap behind, so the island could never close all the way. The spacing
  // lives inside each slot as paddingRight instead, which means it collapses
  // along with the control (and is included in the measured natural width).
  //
  // 8, not 12: the controls carry their own 44pt touch targets via hitSlop, and
  // a wide visual gap made the dead space between them look tappable. Tighter
  // spacing reads as one island of real buttons.
  island: {
    flexDirection: "row",
    alignItems: "center",
  },
  // flexShrink: 0 is what lets the slot narrow to zero without squashing what's
  // inside it — the content keeps its natural width and is clipped instead.
  slotContent: { flexShrink: 0, paddingRight: SLOT_GAP },
  clip: { overflow: "hidden" },
});
