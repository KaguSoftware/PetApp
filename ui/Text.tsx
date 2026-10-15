import { Text as RNText, type TextProps } from "react-native";
import { type as typeScale } from "./tokens";
import { useTheme } from "./theme";

export interface AppTextProps extends TextProps {
  variant?: keyof typeof typeScale;
  tone?: "ink" | "ink2" | "ink3" | "onInk" | "danger" | "green";
}

export function Text({ variant = "body", tone = "ink", style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  const color =
    tone === "ink"
      ? colors.ink
      : tone === "ink2"
        ? colors.ink2
        : tone === "ink3"
          ? colors.ink3
          : tone === "onInk"
            ? colors.onInk
            : tone === "danger"
              ? colors.danger
              : colors.green;
  return <RNText {...rest} style={[typeScale[variant], { color }, style]} />;
}
