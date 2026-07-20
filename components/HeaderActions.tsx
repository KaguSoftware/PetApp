import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import NotificationBell from "@/components/NotificationBell";
import SettingsButton from "@/components/SettingsButton";
import { CoinPill } from "@/components/ui";
import { useStore } from "@/lib/store";

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
 */
export default function HeaderActions({ leading }: { leading?: React.ReactNode }) {
  const router = useRouter();
  const { state } = useStore();
  // The status-bar inset is handled once, at the header level
  // (useHeaderStatusBarInset in components/Screen.tsx) — not here, or the
  // offset would be applied twice on Android.
  return (
    <View style={styles.island}>
      {leading}
      <CoinPill amount={state.coins} onPress={() => router.push("/coins")} />
      <NotificationBell />
      <SettingsButton />
    </View>
  );
}

const styles = StyleSheet.create({
  // gap 8 (not 12): the controls now carry their own 44pt touch targets via
  // hitSlop, and a wide visual gap made the dead space between them look
  // tappable. Tighter spacing reads as one island of real buttons.
  island: { flexDirection: "row", alignItems: "center", gap: 8 },
});
