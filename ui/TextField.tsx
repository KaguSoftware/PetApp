import { forwardRef } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { Text } from "./Text";
import { useTheme } from "./theme";
import { radius, spacing } from "./tokens";

export interface TextFieldProps extends TextInputProps {
  label?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField({ label, style, ...rest }, ref) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="caption" tone="ink2" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        accessibilityLabel={label ?? rest.placeholder}
        placeholderTextColor={colors.ink3}
        selectionColor={colors.ink}
        {...rest}
        style={[styles.input, { backgroundColor: colors.surface, color: colors.ink }, rest.multiline && styles.multiline, style]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs + 2 },
  label: { paddingHorizontal: spacing.sm },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg + 2,
    fontSize: 17,
  },
  multiline: { minHeight: 112, paddingTop: spacing.lg, textAlignVertical: "top" },
});
