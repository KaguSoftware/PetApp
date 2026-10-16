import { StyleSheet, TextInput, View } from "react-native";
import type { Species } from "@/data";
import { Text, borderWidth, spacing, useTheme } from "@/ui";

interface Props {
  species: Species;
  name: string;
  onChange: (name: string) => void;
  onSubmit: () => void;
}

/** Step 2: a big name field. */
export function NameStep({ name, onChange, onSubmit }: Props) {
  const { colors } = useTheme();
  const trimmed = name.trim();
  return (
    <View style={styles.wrap}>
      <Text variant="largeTitle" style={styles.center} accessibilityRole="header">
        What&apos;s their name?
      </Text>
      <TextInput
        value={name}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        placeholder="Name"
        placeholderTextColor={colors.ink3}
        selectionColor={colors.ink}
        accessibilityLabel="Pet name"
        autoFocus
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={24}
        returnKeyType="next"
        style={[styles.input, { color: colors.ink, borderBottomColor: trimmed ? colors.ink : colors.border }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing["3xl"] },
  center: { textAlign: "center" },
  input: {
    fontWeight: "700",
    fontSize: 38,
    lineHeight: 48,
    textAlign: "center",
    minHeight: 64,
    borderBottomWidth: borderWidth,
    paddingVertical: spacing.xs,
  },
});
