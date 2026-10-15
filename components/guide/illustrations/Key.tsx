import { StyleSheet, View } from "react-native";
import { Text } from "@/ui";

/** A coloured dot with a short label, used as a diagram legend entry. */
export function Key({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text variant="caption" tone="ink2">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
