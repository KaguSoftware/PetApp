import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { PressableScale } from "./PressableScale";
import { borderWidth, radius, shadow, spacing, type Tone } from "./tokens";
import { useTheme } from "./theme";

export interface CardProps extends ViewProps {
  /** Pastel fill. Omit for a white surface card with the 2px border. */
  tone?: Tone;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function Card({ tone, onPress, accessibilityLabel, style, children, ...rest }: CardProps) {
  const { colors } = useTheme();
  const base: ViewStyle = tone
    ? { backgroundColor: colors.tones[tone].bg }
    : { backgroundColor: colors.surface, borderWidth, borderColor: colors.border };
  const merged = [styles.card, shadow.card, base, style];
  if (onPress) {
    return (
      <PressableScale onPress={onPress} haptic="tap" accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={merged}>
        {children}
      </PressableScale>
    );
  }
  return (
    <View {...rest} style={merged}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.xl },
});
