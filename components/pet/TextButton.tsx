import { StyleSheet } from "react-native";
import { HIT, Icon, PressableScale, spacing, Text, useTheme, type IconName } from "@/ui";

/** Plain tappable label (optional leading line icon), for actions inside surface cards. */
export function TextButton({
  label,
  icon,
  tone = "ink",
  onPress,
}: {
  label: string;
  icon?: IconName;
  tone?: "ink" | "ink2";
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale onPress={onPress} haptic="tap" accessibilityRole="button" accessibilityLabel={label} style={styles.btn}>
      {icon ? <Icon name={icon} size={18} color={tone === "ink" ? colors.ink : colors.ink2} /> : null}
      <Text variant="headline" tone={tone}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: HIT, alignSelf: "flex-start" },
});
