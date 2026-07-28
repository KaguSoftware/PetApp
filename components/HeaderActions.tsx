import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import NotificationBell from "@/components/NotificationBell";
import SettingsButton from "@/components/SettingsButton";
import { CoinPill } from "@/components/ui";
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
 * The island is deliberately transparent: each control paints its own pill, so
 * the space BETWEEN them is not part of any button. Tapping there used to feel
 * like hitting a dead button; now there is simply nothing to hit.
 *
 * LAYOUT — plain flex row, nothing measured. The island used to animate each
 * optional control's WIDTH between zero and a measured "natural" width so it
 * read as one object resizing between tabs, and that is what made the coin and
 * streak pills overlap the bell:
 *
 *   a slot with an animated width stretches its child to that width (RN's
 *   default `alignItems` is `stretch`), so the child's onLayout reported the
 *   SLOT's width back as its own natural width — and with the "only update if
 *   it changed" guard, the measurement froze at whatever the first render
 *   happened to be. A balance growing a digit (999 → 1,250) then had nowhere
 *   to go: RN children don't shrink by default and overflow is visible, so the
 *   number simply spilled out of its frozen pill and painted over the bell.
 *
 * Real layout can't do that — every control is laid out at its own size, every
 * time, however long the number gets. The trade is that switching tabs now
 * hard-cuts the controls it adds or drops instead of sliding them open/shut;
 * the entrance stagger below still covers the arrival, and unlike a width
 * animation it is transform-only, so it can never affect what sits next to it.
 */

/**
 * Space between controls. Wide enough that the pills' bump and glow transforms
 * (which are NOT part of layout — a scaled pill still occupies its original
 * box) stay clear of the neighbouring control at their peak: the widest pill is
 * ~75pt, and the strongest transform on it is the earn glow at 1.18, so it
 * blooms ~7pt past its own edge. Tighter spacing than this and a celebrating
 * coin pill reaches the bell again.
 */
const ISLAND_GAP = 10;

/**
 * Which controls the previously-mounted island had, kept at MODULE scope —
 * deliberately outside React, for the same reason `lastSeen` is in
 * lib/useGooeyBump.tsx. A tab switch destroys one island and builds the next,
 * so the new instance has no other way to know which controls were already on
 * screen a frame ago and should therefore skip their entrance.
 */
let lastSlots = new Set<string>();

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
  const [prev] = useState(() => lastSlots);
  useEffect(() => {
    lastSlots = slots;
  });

  // Each screen builds its OWN island, so a tab switch destroys one and mounts
  // the next. The departure can't be animated (see useHeaderPillEntrance), so
  // the arrival carries the polish: each control springs in on its own delay,
  // cascading left-to-right rather than the island snapping in as one block.
  //
  // Controls the previous island ALREADY had skip that entrance entirely —
  // they're meant to look like they never left. Indices stay dense across the
  // controls that do animate, or the cascade would inherit a gap.
  let slot = 0;
  const entranceIndex = (key: string) => (prev.has(key) ? -1 : slot++);
  const leadingAnim = useHeaderPillEntrance(...pill(entranceIndex("leading")));
  const coinsAnim = useHeaderPillEntrance(...pill(entranceIndex("coins")));
  const bellAnim = useHeaderPillEntrance(...pill(entranceIndex("bell")));
  const gearAnim = useHeaderPillEntrance(...pill(entranceIndex("gear")));
  // The status-bar inset is handled once, at the header level
  // (statusBarTranslucent in nativeHeaderOptions, components/Screen.tsx) —
  // not here, or the offset would be applied twice on Android.
  return (
    <View style={styles.island}>
      {leading ? <Animated.View style={leadingAnim}>{leading}</Animated.View> : null}
      {showCoins ? (
        <Animated.View style={coinsAnim}>
          <CoinPill amount={state.coins} onPress={() => router.push("/coins")} />
        </Animated.View>
      ) : null}
      <Animated.View style={bellAnim}>
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
  island: { flexDirection: "row", alignItems: "center", gap: ISLAND_GAP },
});
