import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { reloadHousehold } from "@/data";
import { PillButton, Text, spacing } from "@/ui";

/** Shown when the household failed to load: never treated as "no household". */
export function LoadErrorState({ title = "We couldn't reach your family's data" }: { title?: string }) {
  const [busy, setBusy] = useState(false);

  async function retry() {
    if (busy) return;
    setBusy(true);
    try {
      await reloadHousehold();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text variant="title" style={styles.center} accessibilityRole="header">
        {title}
      </Text>
      <Text tone="ink2" style={styles.center}>
        Check your connection and give it another go.
      </Text>
      <PillButton label="Retry" onPress={retry} loading={busy} fullWidth={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: spacing.md, paddingVertical: spacing["3xl"], paddingHorizontal: spacing.xl },
  center: { textAlign: "center" },
});
