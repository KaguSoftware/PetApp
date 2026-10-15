import { StyleSheet, View } from "react-native";
import { RoundTile, Text, spacing, type IconName, type Tone } from "@/ui";
import type { CareMeta } from "./careMeta";

export type RecordKind = "weight" | "health" | "note";

const RECORDS: { key: RecordKind; label: string; icon: IconName; tone: Tone }[] = [
  { key: "weight", label: "Weight", icon: "weight", tone: "mint" },
  { key: "health", label: "Health", icon: "health", tone: "pink" },
  { key: "note", label: "Note", icon: "note", tone: "butter" },
];

interface TileGridProps {
  daily: CareMeta[];
  showRecords: boolean;
  onDaily: (meta: CareMeta) => void;
  onDailyDetails: (meta: CareMeta) => void;
  onRecord: (kind: RecordKind) => void;
}

/** Tap a daily tile = logged. Long-press = add details first. */
export function TileGrid({ daily, showRecords, onDaily, onDailyDetails, onRecord }: TileGridProps) {
  return (
    <View>
      <Text variant="caption" tone="ink2" style={styles.section}>
        DAILY CARE
      </Text>
      <View style={styles.grid}>
        {daily.map((m) => (
          <View key={m.type} style={styles.cell}>
            <RoundTile
              icon={m.icon}
              label={m.label}
              tone={m.tone}
              onPress={() => onDaily(m)}
              onLongPress={() => onDailyDetails(m)}
            />
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
                <RoundTile icon={r.icon} label={r.label} tone={r.tone} onPress={() => onRecord(r.key)} />
              </View>
            ))}
          </View>
        </>
      ) : null}
      <Text variant="small" tone="ink3" style={styles.hint}>
        {showRecords ? "Hold a tile to add details" : "Weight, health and notes are saved for one pet at a time"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.lg, marginBottom: spacing.md, letterSpacing: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.lg },
  cell: { width: "25%", alignItems: "center" },
  hint: { marginTop: spacing.lg, textAlign: "center" },
});
