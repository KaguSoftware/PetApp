import { StyleSheet, View } from "react-native";
import { Icon, type IconName } from "./icons";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";
import { borderWidth, radius, spacing, type Tone } from "./tokens";
import { useTheme } from "./theme";

export interface ChipProps {
  label: string;
  icon?: IconName;
  tone?: Tone;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ label, icon, tone, selected = false, onPress }: ChipProps) {
  const { colors } = useTheme();
  const bg = selected ? colors.ink : tone ? colors.tones[tone].bg : colors.surface;
  const fg = selected ? colors.onInk : colors.ink;
  const body = (
    <View style={[styles.chip, { backgroundColor: bg }, !tone && !selected && { borderWidth, borderColor: colors.border }]}>
      {icon ? <Icon name={icon} size={16} color={tone && !selected ? colors.tones[tone].fg : fg} /> : null}
      <Text variant="caption" style={{ color: fg, fontSize: 14, lineHeight: 18 }}>
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
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.pill,
  },
});
