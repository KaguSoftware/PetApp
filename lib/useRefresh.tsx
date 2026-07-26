import { useCallback, useState } from "react";
import { RefreshControl } from "react-native";
import { useStore } from "@/lib/store";
import { useColors } from "@/lib/theme";

/**
 * Drop-in `refreshControl` for a `TabScreen` or `PushedScreen`: swipe-down
 * re-runs the store's household hydration (`useStore().refresh`) and shows the
 * native spinner until it settles.
 *
 * `also` lets a screen with its own data source outside the store (the forum
 * feed, say) refresh both in one gesture — the spinner waits for both.
 */
export function usePullToRefresh(also?: () => Promise<unknown>) {
  const { refresh } = useStore();
  const colors = useColors();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refresh(), also?.()]);
    } finally {
      setRefreshing(false);
    }
  }, [refresh, also]);

  return <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.label3} />;
}
