import { forwardRef, useState } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { Text } from "./Text";
import { useTheme } from "./theme";
import { borderWidth, fonts, radius, spacing } from "./tokens";

export interface TextFieldProps extends TextInputProps {
  label?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, style, onFocus, onBlur, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
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
        selectionColor={colors.green}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          { backgroundColor: colors.surface, color: colors.ink, borderColor: focused ? colors.ink : colors.border },
          rest.multiline && styles.multiline,
          style,
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs + 2 },
  label: { paddingHorizontal: spacing.sm },
  input: {
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth,
    paddingHorizontal: spacing.lg + 2,
    fontFamily: fonts.medium,
    fontSize: 16,
  },
  multiline: { minHeight: 112, paddingTop: spacing.lg, textAlignVertical: "top" },
});
