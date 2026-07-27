import { useRouter } from "expo-router";
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
 * The island is deliberately transparent and gap-free: each control paints its
 * own pill, so the space BETWEEN them is not part of any button. Tapping there
 * used to feel like hitting a dead button; now there is simply nothing to hit.
 *
 * Each control is additionally wrapped in its own Animated.View for the
 * entrance stagger. That's safe for the hitTest rule above — the constraint is
 * on what `headerRight` RETURNS (still exactly one root View); these wrappers
 * are nested inside it, which is where extra items are supposed to live.
 */
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
  // Each screen builds its OWN island, so a tab switch destroys one and mounts
  // the next. The departure can't be animated (see useHeaderPillEntrance), so
  // the arrival carries the polish: each control springs in on its own delay,
  // cascading left-to-right rather than the island snapping in as one block.
  //
  // Indices are assigned in visual order and must stay dense even when a pill
  // is hidden, or the bell/gear would inherit a gap in the cascade on tabs
  // without coins.
  let slot = 0;
  const leadingAnim = useHeaderPillEntrance(leading ? slot++ : 0);
  const coinsAnim = useHeaderPillEntrance(showCoins ? slot++ : 0);
  const bellAnim = useHeaderPillEntrance(slot++);
  const gearAnim = useHeaderPillEntrance(slot++);
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

const styles = StyleSheet.create({
  // gap 8 (not 12): the controls now carry their own 44pt touch targets via
  // hitSlop, and a wide visual gap made the dead space between them look
  // tappable. Tighter spacing reads as one island of real buttons.
  island: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
