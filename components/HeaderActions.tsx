import { useRouter } from "expo-router";
import NotificationBell from "@/components/NotificationBell";
import { CoinPill } from "@/components/ui";
import { useStore } from "@/lib/store";

/**
 * The standard top-right header island for every tab: the coin balance (taps
 * through to the coins screen) next to the notification bell. Kept in one place
 * so the "island" is identical on every tab — coins show everywhere, never a
 * lone bell in a coin-shaped gap.
 */
export default function HeaderActions() {
  const router = useRouter();
  const { state } = useStore();
  return (
    <>
      <CoinPill amount={state.coins} onPress={() => router.push("/coins")} />
      <NotificationBell />
    </>
  );
}
