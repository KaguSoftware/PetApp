import { Text as RNText, type TextProps } from "react-native";
import { type as typeScale } from "./tokens";
import { useTheme } from "./theme";

export interface AppTextProps extends TextProps {
  variant?: keyof typeof typeScale;
  tone?: "ink" | "ink2" | "ink3" | "onInk" | "danger" | "inverse" | "inverse2";
}

export function Text({ variant = "body", tone = "ink", style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  const color = {
    ink: colors.ink,
    ink2: colors.ink2,
    ink3: colors.ink3,
    onInk: colors.onInk,
    danger: colors.danger,
    inverse: colors.inverseInk,
    inverse2: colors.inverseInk2,
  }[tone];
  return <RNText {...rest} style={[typeScale[variant], { color }, style]} />;
}
