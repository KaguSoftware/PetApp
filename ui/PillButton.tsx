import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Icon, type IconName } from "./icons";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";
import { radius, spacing } from "./tokens";
import { useTheme } from "./theme";

export interface PillButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  size?: "md" | "lg" | "sm";
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const HEIGHT = { sm: 44, md: 52, lg: 58 } as const;

export function PillButton({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  disabled = false,
  fullWidth = true,
  accessibilityLabel,
  style,
}: PillButtonProps) {
  const { colors } = useTheme();
  const primary = variant === "primary";
  const fg = primary ? colors.bg : colors.ink;
  const off = disabled || loading;

  return (
    <PressableScale
      onPress={onPress}
      disabled={off}
      scaleTo={0.97}
      haptic="tap"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: off, busy: loading }}
      style={[
        styles.pill,
        { height: HEIGHT[size], opacity: disabled ? 0.4 : 1, backgroundColor: primary ? colors.ink : colors.surface },
        fullWidth ? styles.full : styles.hug,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={20} color={fg} /> : null}
          <Text variant="headline" style={{ color: fg, fontSize: size === "sm" ? 15 : 17 }}>
            {label}
          </Text>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: radius.pill, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing["2xl"] },
  full: { alignSelf: "stretch" },
  hug: { alignSelf: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
