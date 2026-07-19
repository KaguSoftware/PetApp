import { useRouter } from "expo-router";
import NotificationBell from "@/components/NotificationBell";
import SettingsButton from "@/components/SettingsButton";
import { CoinPill } from "@/components/ui";
import { useStore } from "@/lib/store";

/**
 * The standard top-right header island for every tab: the coin balance (taps
 * through to the coins screen), the notification bell, and the settings gear
 * (Settings isn't a bottom tab — Community took its slot). Kept in one place
 * so the "island" is identical on every tab.
 */
export default function HeaderActions() {
  const router = useRouter();
  const { state } = useStore();
  return (
    <>
      <CoinPill amount={state.coins} onPress={() => router.push("/coins")} />
      <NotificationBell />
      <SettingsButton />
    </>
  );
}
