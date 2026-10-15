import { StyleSheet, View } from "react-native";
import { Icon, PressableScale, Text, borderWidth, spacing, useTheme } from "@/ui";

export function StepHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <PressableScale
        onPress={onBack}
        haptic="select"
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={[styles.back, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.flip}>
          <Icon name="chevron" size={22} color={colors.ink} />
        </View>
      </PressableScale>
      <Text variant="title" accessibilityRole="header" style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  title: { flex: 1 },
  back: { width: 44, height: 44, borderRadius: 22, borderWidth, alignItems: "center", justifyContent: "center" },
  flip: { transform: [{ scaleX: -1 }] },
});
