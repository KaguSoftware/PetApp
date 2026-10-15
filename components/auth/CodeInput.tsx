import { useRef } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Text, borderWidth, radius, spacing, useTheme } from "@/ui";

export const CODE_LENGTH = 6;

/**
 * Six cells over ONE hidden input (not six) so paste and OS one-time-code
 * autofill work naturally. Calls `onComplete` as soon as the last digit lands.
 */
export function CodeInput({
  value,
  onChange,
  onComplete,
  autoFocus,
}: {
  value: string;
  onChange: (digits: string) => void;
  onComplete: (digits: string) => void;
  autoFocus?: boolean;
}) {
  const { colors } = useTheme();
  const inputRef = useRef<TextInput>(null);

  function handleChange(text: string) {
    const digits = text.replace(/\D/g, "").slice(0, CODE_LENGTH);
    onChange(digits);
    if (digits.length === CODE_LENGTH) onComplete(digits);
  }

  return (
    <View>
      <Pressable
        style={styles.row}
        onPress={() => inputRef.current?.focus()}
        accessibilityLabel={`Code entry, ${value.length} of ${CODE_LENGTH} digits entered`}
      >
        {Array.from({ length: CODE_LENGTH }, (_, i) => (
          <View
            key={i}
            style={[
              styles.cell,
              { backgroundColor: colors.surface, borderColor: i === value.length ? colors.ink : colors.border },
            ]}
          >
            <Text variant="title">{value[i] ?? ""}</Text>
          </View>
        ))}
      </Pressable>
      <TextInput
        ref={inputRef}
        style={styles.hidden}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        caretHidden
        maxLength={CODE_LENGTH}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm, justifyContent: "center" },
  cell: {
    width: 48,
    height: 60,
    borderRadius: radius.md,
    borderWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  hidden: { position: "absolute", opacity: 0, height: 1, width: 1 },
});
