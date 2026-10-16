import { StyleSheet, View } from "react-native";
import { Icon, type IconName } from "./icons";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";
import { radius, spacing } from "./tokens";
import { useTheme } from "./theme";

export interface ChipProps {
  label: string;
  icon?: IconName;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ label, icon, selected = false, onPress }: ChipProps) {
  const { colors } = useTheme();
  const fg = selected ? colors.bg : colors.ink;
  const body = (
    <View style={[styles.chip, { backgroundColor: selected ? colors.ink : colors.surface }]}>
      {icon ? <Icon name={icon} size={16} color={fg} /> : null}
      <Text variant="callout" style={{ color: fg, fontWeight: "500" }}>
        {label}
      </Text>
    </View>
  );
  if (!onPress) return body;
  return (
    <PressableScale
      onPress={onPress}
      haptic="select"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      // Chip body is 36pt tall; hitSlop brings the target to 44.
      hitSlop={{ top: 4, bottom: 4 }}
    >
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
});
