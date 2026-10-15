import { StyleSheet, View } from "react-native";
import { Icon, type IconName } from "./icons";
import { PillButton } from "./PillButton";
import { Text } from "./Text";
import { useTheme } from "./theme";
import { spacing, type Tone } from "./tokens";

export interface EmptyStateProps {
  icon: IconName;
  tone?: Tone;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, tone = "butter", title, message, actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.disc, { backgroundColor: colors.tones[tone].bg }]}>
        <Icon name={icon} size={44} color={colors.tones[tone].fg} />
      </View>
      <Text variant="heading" style={styles.center}>
        {title}
      </Text>
      {message ? (
        <Text tone="ink2" style={styles.center}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? <PillButton label={actionLabel} onPress={onAction} fullWidth={false} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: spacing.md, paddingVertical: spacing["4xl"], paddingHorizontal: spacing["2xl"] },
  disc: { width: 104, height: 104, borderRadius: 52, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  center: { textAlign: "center" },
});
