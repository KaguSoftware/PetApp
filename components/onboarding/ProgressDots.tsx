import { StyleSheet, View } from "react-native";
import { spacing, useTheme } from "@/ui";

export function ProgressDots({ count, index }: { count: number; index: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${index + 1} of ${count}`}
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[styles.dot, { backgroundColor: i === index ? colors.ink : colors.border }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
