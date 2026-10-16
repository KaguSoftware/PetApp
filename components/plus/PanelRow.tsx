import { Pressable, StyleSheet, View } from "react-native";
import { RoundButton, Text, spacing, type IconName } from "@/ui";

/** One row of the + panel: bold title, grey status line, round line-icon button. */
export function PanelRow({
  title,
  status,
  icon,
  buttonLabel,
  onPress,
}: {
  title: string;
  status: string;
  icon: IconName;
  buttonLabel: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${status}`}
        style={styles.text}
      >
        <Text variant="headline" tone="inverse">
          {title}
        </Text>
        <Text variant="callout" tone="inverse2">
          {status}
        </Text>
      </Pressable>
      <RoundButton variant="inverse" size={56} icon={icon} accessibilityLabel={buttonLabel} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 76 },
  text: { flex: 1, justifyContent: "center", minHeight: 56 },
});
