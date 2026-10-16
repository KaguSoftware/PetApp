import { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  deleteLog,
  deleteNote,
  deleteVaccination,
  deleteVetVisit,
  deleteWeight,
  editLog,
  type Pet,
} from "@/data";
import { clockTime, dayLabel } from "@/lib/format";
import { PillButton, Sheet, spacing, Text } from "@/ui";
import { EditCareFields, type EditCareFieldsValue } from "./EditCareFields";
import type { HistoryItem } from "./model";

export interface DetailSheetProps {
  item: HistoryItem | null;
  pet: Pet | undefined;
  who: string | null;
  onClose: () => void;
}

function removeItem(item: HistoryItem): Promise<void> {
  const s = item.source;
  switch (s.kind) {
    case "care":
      return deleteLog(s.log.id);
    case "weight":
      return deleteWeight(s.entry.id);
    case "vaccination":
      return deleteVaccination(s.record.id);
    case "vet":
      return deleteVetVisit(s.record.id);
    case "note":
      return deleteNote(s.note.id);
  }
}

function toValue(item: HistoryItem): EditCareFieldsValue {
  const log = item.source.kind === "care" ? item.source.log : null;
  return {
    ts: item.ts,
    note: log?.note ?? "",
    grams: log?.grams ? String(log.grams) : "",
    duration: log?.durationMinutes ? String(log.durationMinutes) : "",
  };
}

function positiveInt(text: string): number | null {
  const n = Math.round(Number(text));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function DetailSheet({ item, pet, who, onClose }: DetailSheetProps) {
  // Keep the last item mounted while the sheet animates out; a new item resets the edit state.
  const [shown, setShown] = useState<HistoryItem | null>(item);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<EditCareFieldsValue | null>(null);
  const [now, setNow] = useState(() => Date.now());
  if (item && item !== shown) {
    setShown(item);
    setEditing(false);
    setValue(null);
  }
  const current = item ?? shown;

  const log = current?.source.kind === "care" ? current.source.log : null;

  const confirmDelete = () => {
    if (!current) return;
    Alert.alert("Delete this entry?", "This can't be undone.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          onClose();
          // The data layer rolls back and shows its own toast on failure.
          removeItem(current).catch(() => undefined);
        },
      },
    ]);
  };

  const save = () => {
    if (!log || !value) return;
    onClose();
    editLog(log.id, {
      ts: value.ts,
      note: value.note.trim() || null,
      grams: log.type === "fed" ? positiveInt(value.grams) : null,
      durationMinutes: log.type === "walk" || log.type === "groomed" ? positiveInt(value.duration) : null,
    }).catch(() => undefined);
  };

  return (
    <Sheet open={item !== null} onClose={onClose}>
      {current ? (
        <ScrollView bounces={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.head}>
            <Text variant="title" accessibilityRole="header">
              {current.title}
            </Text>
            <Text tone="ink2" variant="callout">
              {[pet?.name, `${dayLabel(current.ts)}, ${clockTime(current.ts)}`, who].filter(Boolean).join(" · ")}
            </Text>
          </View>

          {editing && value && log ? (
            <>
              <EditCareFields
                value={value}
                onChange={setValue}
                showGrams={log.type === "fed"}
                showDuration={log.type === "walk" || log.type === "groomed"}
                now={now}
              />
              <PillButton label="Save changes" onPress={save} />
              <PillButton label="Cancel" variant="secondary" onPress={() => setEditing(false)} />
            </>
          ) : (
            <>
              {current.detail ? <Text>{current.detail}</Text> : null}
              {log ? (
                <PillButton
                  label="Edit"
                  icon="edit"
                  variant="secondary"
                  onPress={() => {
                    setValue(toValue(current));
                    setNow(Date.now());
                    setEditing(true);
                  }}
                />
              ) : null}
              <PillButton label="Delete" icon="trash" variant="secondary" onPress={confirmDelete} />
            </>
          )}
        </ScrollView>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.sm },
  head: { gap: 2 },
});
