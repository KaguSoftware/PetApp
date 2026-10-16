import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, StyleSheet } from "react-native";
import { EditCareFields, type EditCareFieldsValue } from "@/components/history/EditCareFields";
import { buildItems, itemRoute, type HistoryItem } from "@/components/history";
import {
  deleteLog,
  deleteNote,
  deleteVaccination,
  deleteVetVisit,
  deleteWeight,
  editLog,
  useHousehold,
  useLogs,
  useMembers,
  useMeds,
  useNotes,
  usePet,
  useVaccinations,
  useVetVisits,
  useWeights,
} from "@/data";
import { clockTime, dayLabel } from "@/lib/format";
import { layout, PillButton, SheetScreen, Text } from "@/ui";

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

const close = () => (router.canGoBack() ? router.back() : router.replace("/home"));

/**
 * `/history/[kind]/[id]?petId=`: one history entry as a native form sheet. Shows the details with
 * Edit (care logs) and Delete (an Alert confirms).
 */
export default function HistoryDetailSheet() {
  const params = useLocalSearchParams<{ kind: string; id: string; petId: string }>();
  const { kind, id, petId } = params;
  const pet = usePet(petId ?? "");
  const { units } = useHousehold();
  const members = useMembers();
  const logs = useLogs({ petId });
  const notes = useNotes(petId);
  const meds = useMeds(petId);
  const weights = useWeights(petId ?? "");
  const vaccinations = useVaccinations(petId ?? "");
  const vetVisits = useVetVisits(petId ?? "");

  const item = useMemo(() => {
    if (!pet) return undefined;
    return buildItems({
      logs,
      notes,
      meds,
      feeds: { [pet.id]: { weights, vaccinations, vetVisits } },
      petNames: { [pet.id]: pet.name },
      units,
      sinceMs: 0,
    }).find((i) => {
      const r = itemRoute(i);
      return r.kind === kind && r.id === id;
    });
  }, [pet, logs, notes, meds, weights, vaccinations, vetVisits, units, kind, id]);

  // Keep the last item while the sheet animates out after a delete / save.
  const [shown, setShown] = useState<HistoryItem | undefined>(item);
  if (item && item !== shown) setShown(item);
  const current = item ?? shown;

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<EditCareFieldsValue | null>(null);
  const [now, setNow] = useState(() => Date.now());

  if (!current) return <SheetScreen title="Entry">{null}</SheetScreen>;

  const log = current.source.kind === "care" ? current.source.log : null;
  const who = members.length > 1 && current.memberId ? (members.find((m) => m.id === current.memberId)?.name ?? null) : null;

  const confirmDelete = () =>
    Alert.alert("Delete this entry?", "This can't be undone.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          close();
          // The data layer rolls back and shows its own toast on failure.
          removeItem(current).catch(() => undefined);
        },
      },
    ]);

  const save = () => {
    if (!log || !value) return;
    close();
    editLog(log.id, {
      ts: value.ts,
      note: value.note.trim() || null,
      grams: log.type === "fed" ? positiveInt(value.grams) : null,
      durationMinutes: log.type === "walk" || log.type === "groomed" ? positiveInt(value.duration) : null,
    }).catch(() => undefined);
  };

  return (
    <SheetScreen
      title={current.title}
      subtitle={[pet?.name, `${dayLabel(current.ts)}, ${clockTime(current.ts)}`, who].filter(Boolean).join(" · ")}
    >
      {editing && value && log ? (
        <>
          <EditCareFields
            value={value}
            onChange={setValue}
            showGrams={log.type === "fed"}
            showDuration={log.type === "walk" || log.type === "groomed"}
            now={now}
          />
          <PillButton label="Save changes" onPress={save} style={styles.first} />
          <PillButton label="Cancel" variant="secondary" onPress={() => setEditing(false)} />
        </>
      ) : (
        <>
          {current.detail ? <Text style={styles.detail}>{current.detail}</Text> : null}
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
    </SheetScreen>
  );
}

const styles = StyleSheet.create({
  first: { marginTop: layout.headerGap },
  detail: { paddingBottom: layout.headerGap },
});
