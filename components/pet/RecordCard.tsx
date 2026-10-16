import { Alert, StyleSheet, View } from "react-native";
import { borderWidth, Card, HIT, PressableScale, spacing, Text, useTheme } from "@/ui";
import { TextButton } from "./TextButton";

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

function Row({ row, last, onRemove }: { row: RecordRowData; last: boolean; onRemove: (id: string) => void }) {
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
      style={[styles.row, !last && { borderBottomColor: colors.border, borderBottomWidth: borderWidth }]}
    >
      <View style={styles.rowText}>
        <Text variant="body" numberOfLines={2} style={row.highlight ? styles.strong : undefined}>
          {row.title}
        </Text>
        {row.subtitle ? (
          <Text variant="callout" tone="ink2" numberOfLines={2}>
            {row.subtitle}
          </Text>
        ) : null}
      </View>
      {row.badge ? (
        <Text variant="footnote" tone={row.highlight ? "ink" : "ink2"}>
          {row.badge}
        </Text>
      ) : null}
    </PressableScale>
  );
}

export function RecordCard({ title, rows, emptyText, addLabel, onAdd, onRemove }: RecordCardProps) {
  return (
    <Card style={styles.card}>
      <Text variant="headline" accessibilityRole="header">
        {title}
      </Text>
      {rows.length === 0 ? (
        <Text tone="ink2" variant="callout">
          {emptyText}
        </Text>
      ) : (
        <View>
          {rows.map((r, i) => (
            <Row key={r.id} row={r} last={i === rows.length - 1} onRemove={onRemove} />
          ))}
          <Text variant="caption" tone="ink3" style={styles.hint}>
            Long press an entry to remove it.
          </Text>
        </View>
      )}
      <TextButton label={addLabel} icon="plus" onPress={onAdd} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: HIT,
    paddingVertical: spacing.sm,
  },
  rowText: { flex: 1, gap: 1 },
  strong: { fontWeight: "600" },
  hint: { paddingTop: spacing.xs },
});
