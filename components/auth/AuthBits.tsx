import { StyleSheet, View } from "react-native";
import { PressableScale, Text, borderWidth, spacing, useTheme } from "@/ui";

export function OrDivider() {
  const { colors } = useTheme();
  return (
    <View style={styles.divider}>
      <View style={[styles.line, { backgroundColor: colors.border }]} />
      <Text variant="caption" tone="ink3">
        or
      </Text>
      <View style={[styles.line, { backgroundColor: colors.border }]} />
    </View>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Text variant="small" tone="danger" accessibilityRole="alert" style={styles.error}>
      {message}
    </Text>
  );
}

/** Quiet text button with a 44pt target. */
export function AuthLink({ label, onPress, prefix }: { label: string; onPress: () => void; prefix?: string }) {
  return (
    <View style={styles.linkRow}>
      {prefix ? <Text tone="ink2">{prefix} </Text> : null}
      <PressableScale onPress={onPress} haptic="select" accessibilityRole="link" accessibilityLabel={label} style={styles.link}>
        <Text variant="bodyStrong">{label}</Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  divider: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  line: { flex: 1, height: borderWidth, borderRadius: 1 },
  error: { paddingHorizontal: spacing.xs },
  linkRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  link: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.xs },
});
