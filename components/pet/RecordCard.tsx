import { Alert, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { borderWidth, Card, layout, PressableScale, Text, useItemMotion, useTheme } from "@/ui";
import { TextButton } from "./TextButton";

export interface RecordRowData {
  id: string;
  title: string;
  subtitle: string | null;
  /** Gentle trailing note, e.g. "due in 12 days". */
  badge?: string | null;
  /** Soft highlight for the next thing coming up. */
  highlight?: boolean;
  /** Optional tap action. */
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

function Row({ row, index, onRemove }: { row: RecordRowData; index: number; onRemove: (id: string) => void }) {
  const { colors } = useTheme();
  const motion = useItemMotion(index);
  return (
    <Animated.View {...motion}>
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
        style={[styles.row, { borderTopColor: colors.border }]}
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
    </Animated.View>
  );
}

export function RecordCard({ title, rows, emptyText, addLabel, onAdd, onRemove }: RecordCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Text variant="headline" accessibilityRole="header">
          {title}
        </Text>
      </View>
      {rows.length === 0 ? (
        <Text tone="ink2" variant="callout" style={styles.empty}>
          {emptyText}
        </Text>
      ) : (
        <>
          {rows.map((r, i) => (
            <Row key={r.id} row={r} index={i} onRemove={onRemove} />
          ))}
          <Text variant="caption" tone="ink3" style={styles.hint}>
            Long press an entry to remove it.
          </Text>
        </>
      )}
      <TextButton label={addLabel} icon="plus" onPress={onAdd} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 0 },
  head: { minHeight: layout.rowMinHeight, justifyContent: "center" },
  empty: { paddingBottom: layout.item },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.item,
    minHeight: layout.rowMinHeight,
    paddingVertical: layout.rowPadV,
    borderTopWidth: borderWidth,
  },
  rowText: { flex: 1, gap: 2 },
  strong: { fontWeight: "600" },
  hint: { paddingBottom: layout.headerGap },
});
