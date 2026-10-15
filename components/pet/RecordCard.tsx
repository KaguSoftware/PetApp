import { Alert, StyleSheet, View } from "react-native";
import { HIT, Icon, PillButton, PressableScale, spacing, Text, useTheme, Card, type IconName, type Tone } from "@/ui";

export interface RecordRowData {
  id: string;
  title: string;
  subtitle: string | null;
  /** Gentle trailing note, e.g. "due in 12 days". */
  badge?: string | null;
  /** Soft highlight for the next thing coming up. */
  highlight?: boolean;
  /** Optional tap action (e.g. pause a med). */
  onPress?: () => void;
  pressLabel?: string;
}

export interface RecordCardProps {
  title: string;
  icon: IconName;
  tone: Tone;
  rows: RecordRowData[];
  emptyText: string;
  addLabel: string;
  onAdd: () => void;
  onRemove: (id: string) => void;
}

function confirmRemove(row: RecordRowData, onRemove: (id: string) => void) {
  Alert.alert(`Remove ${row.title}?`, "This can't be undone.", [
    { text: "Keep it", style: "cancel" },
    { text: "Remove", style: "destructive", onPress: () => onRemove(row.id) },
  ]);
}

function Row({ row, onRemove }: { row: RecordRowData; onRemove: (id: string) => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={row.onPress}
      onLongPress={() => confirmRemove(row, onRemove)}
      delayLongPress={350}
      haptic={row.onPress ? "select" : undefined}
      accessibilityRole="button"
      accessibilityLabel={[row.title, row.subtitle, row.badge].filter(Boolean).join(", ")}
      accessibilityHint={row.pressLabel ? `${row.pressLabel}. Long press to remove` : "Long press to remove"}
      accessibilityActions={[{ name: "delete", label: "Remove" }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === "delete") confirmRemove(row, onRemove);
      }}
      style={[styles.row, row.highlight && { backgroundColor: colors.surface }]}
    >
      <View style={styles.rowText}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {row.title}
        </Text>
        {row.subtitle ? (
          <Text variant="small" tone="ink2" numberOfLines={2}>
            {row.subtitle}
          </Text>
        ) : null}
      </View>
      {row.badge ? (
        <Text variant="caption" tone="ink2">
          {row.badge}
        </Text>
      ) : null}
    </PressableScale>
  );
}

export function RecordCard({ title, icon, tone, rows, emptyText, addLabel, onAdd, onRemove }: RecordCardProps) {
  const { colors } = useTheme();
  return (
    <Card tone={tone} style={styles.card}>
      <View style={styles.head}>
        <Icon name={icon} size={22} color={colors.tones[tone].fg} />
        <Text variant="heading" accessibilityRole="header">
          {title}
        </Text>
      </View>
      {rows.length === 0 ? (
        <Text tone="ink2">{emptyText}</Text>
      ) : (
        <View style={styles.list}>
          {rows.map((r) => (
            <Row key={r.id} row={r} onRemove={onRemove} />
          ))}
          <Text variant="caption" tone="ink3">
            Long press an entry to remove it.
          </Text>
        </View>
      )}
      <PillButton label={addLabel} icon="plus" variant="secondary" onPress={onAdd} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  list: { gap: spacing.xs },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: HIT,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
  },
  rowText: { flex: 1, gap: 1 },
});
