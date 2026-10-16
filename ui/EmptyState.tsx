import { StyleSheet, View } from "react-native";
import { Icon, type IconName } from "./icons";
import { PillButton } from "./PillButton";
import { Text } from "./Text";
import { useTheme } from "./theme";
import { layout, spacing } from "./tokens";

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      {icon ? <Icon name={icon} size={32} color={colors.ink3} /> : null}
      <Text variant="headline" style={styles.center}>
        {title}
      </Text>
      {message ? (
        <Text variant="callout" tone="ink2" style={styles.center}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? <PillButton label={actionLabel} onPress={onAction} fullWidth={false} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: spacing.md, paddingVertical: layout.section, paddingHorizontal: layout.gutter },
  center: { textAlign: "center" },
});
