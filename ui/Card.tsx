import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { PressableScale } from "./PressableScale";
import { radius, spacing } from "./tokens";
import { useTheme } from "./theme";

export interface CardProps extends ViewProps {
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Flat surface-filled card: no border, no shadow. */
export function Card({ onPress, accessibilityLabel, style, children, ...rest }: CardProps) {
  const { colors } = useTheme();
  const merged = [styles.card, { backgroundColor: colors.surface }, style];
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
