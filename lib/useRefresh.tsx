import { useCallback, useState } from "react";
import { RefreshControl } from "react-native";
import { useStore } from "@/lib/store";
import { colors } from "@/lib/theme";

/**
 * Drop-in `refreshControl` for a `TabScreen`: swipe-down re-runs the store's
 * household hydration (`useStore().refresh`) and shows the native spinner
 * until it settles.
 */
export function usePullToRefresh() {
  const { refresh } = useStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  return <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.label3} />;
}
