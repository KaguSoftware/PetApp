import { StyleSheet, View } from "react-native";
import { RoundButton, Text, spacing, type IconName } from "@/ui";
import type { CareMeta } from "./careMeta";

export type RecordKind = "weight" | "health" | "note";

const RECORDS: { key: RecordKind; label: string; icon: IconName }[] = [
  { key: "weight", label: "Weight", icon: "weight" },
  { key: "health", label: "Health", icon: "health" },
  { key: "note", label: "Note", icon: "note" },
];

interface TileGridProps {
  daily: CareMeta[];
  showRecords: boolean;
  onDaily: (meta: CareMeta) => void;
  onDailyDetails?: (meta: CareMeta) => void;
  onRecord: (kind: RecordKind) => void;
}

/** Round line-icon button with its label underneath. */
function Tile({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <View style={styles.tile}>
      <RoundButton icon={icon} size={56} accessibilityLabel={label} onPress={onPress} />
      <Text variant="footnote" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Tap a daily tile = logged. Long-press = add details first. */
export function TileGrid({ daily, showRecords, onDaily, onRecord }: TileGridProps) {
  return (
    <View>
      <Text variant="caption" tone="ink2" style={styles.section}>
        DAILY CARE
      </Text>
      <View style={styles.grid}>
        {daily.map((m) => (
          <View key={m.type} style={styles.cell}>
            <Tile icon={m.icon} label={m.label} onPress={() => onDaily(m)} />
          </View>
        ))}
      </View>
      {showRecords ? (
        <>
          <Text variant="caption" tone="ink2" style={styles.section}>
            RECORDS
          </Text>
          <View style={styles.grid}>
            {RECORDS.map((r) => (
              <View key={r.key} style={styles.cell}>
                <Tile icon={r.icon} label={r.label} onPress={() => onRecord(r.key)} />
              </View>
            ))}
          </View>
        </>
      ) : null}
      <Text variant="callout" tone="ink3" style={styles.hint}>
        {showRecords ? "Weight, health and notes" : "Weight, health and notes are saved for one pet at a time"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.lg, marginBottom: spacing.md, letterSpacing: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.lg },
  cell: { width: "25%", alignItems: "center" },
  tile: { alignItems: "center", gap: spacing.xs },
  hint: { marginTop: spacing.lg, textAlign: "center" },
});
