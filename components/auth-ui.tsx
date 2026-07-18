import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, type TextInputProps } from "react-native";
import { colors, radius } from "@/lib/theme";

/** Phase-1 auth form primitives; the full design-system pass replaces these. */

export function Field(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.label3} {...props} style={[styles.field, props.style]} />;
}

export function AccentButton({ label, onPress, loading, disabled }: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.button, (pressed || disabled || loading) && { opacity: 0.7 }]}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonLabel}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: colors.label,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  buttonLabel: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
