import { StyleSheet } from "react-native";
import { Icon, type IconName } from "./icons";
import { PressableScale } from "./PressableScale";
import { useTheme } from "./theme";

export interface RoundButtonProps {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  size?: 48 | 56;
  /** `inverse` sits inside the inverted + panel. */
  variant?: "default" | "inverse";
  disabled?: boolean;
}

/** Circular button with a thin line icon. */
export function RoundButton({ icon, onPress, accessibilityLabel, size = 48, variant = "default", disabled = false }: RoundButtonProps) {
  const { colors } = useTheme();
  const inverse = variant === "inverse";
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      haptic="tap"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.btn,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: inverse ? colors.inverseSurface : colors.surface, opacity: disabled ? 0.4 : 1 },
      ]}
    >
      <Icon name={icon} size={size === 56 ? 26 : 22} color={inverse ? colors.inverseInk : colors.ink} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: "center", justifyContent: "center" },
});
