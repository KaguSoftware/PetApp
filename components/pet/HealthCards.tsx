import { useMemo } from "react";
import {
  deleteMed,
  deleteVaccination,
  deleteVetVisit,
  useMeds,
  useVaccinations,
  useVetVisits,
} from "@/data";
import { daysUntil, formatDate } from "@/lib/format";
import { RecordCard, type RecordRowData } from "./RecordCard";
import type { AddKind } from "./AddSheets";

const swallow = () => undefined; // the data layer already rolled back and toasted

function dueNote(nextDue: string): string | null {
  const d = daysUntil(nextDue);
  if (Number.isNaN(d)) return null;
  if (d < 0) return "time for a booster";
  if (d === 0) return "due today";
  if (d <= 30) return `due in ${d} ${d === 1 ? "day" : "days"}`;
  return `next ${formatDate(nextDue)}`;
}

export function VaccinationsCard({ petId, onAdd }: { petId: string; onAdd: (k: AddKind) => void }) {
  const items = useVaccinations(petId);
  const rows = useMemo<RecordRowData[]>(() => {
    const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));
    // Highlight the soonest upcoming (or just-passed) due date, gently.
    const upcoming = sorted
      .filter((v) => v.nextDue)
      .sort((a, b) => (a.nextDue ?? "").localeCompare(b.nextDue ?? ""))[0];
    return sorted.map((v) => ({
      id: v.id,
      title: v.name,
      subtitle: `Given ${formatDate(v.date)}`,
      badge: v.nextDue ? dueNote(v.nextDue) : null,
      highlight: v.id === upcoming?.id,
    }));
  }, [items]);
  return (
    <RecordCard
      title="Vaccinations"
rows={rows}
      emptyText="No vaccinations recorded yet."
      addLabel="Add vaccination"
      onAdd={() => onAdd("vaccination")}
      onRemove={(id) => deleteVaccination(id).catch(swallow)}
    />
  );
}

export function VetVisitsCard({ petId, onAdd }: { petId: string; onAdd: (k: AddKind) => void }) {
  const items = useVetVisits(petId);
  const rows = useMemo<RecordRowData[]>(
    () =>
      [...items]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((v) => ({ id: v.id, title: v.reason, subtitle: [formatDate(v.date), v.notes].filter(Boolean).join(" · "), badge: null })),
    [items],
  );
  return (
    <RecordCard
      title="Vet visits"
rows={rows}
      emptyText="No vet visits yet."
      addLabel="Add vet visit"
      onAdd={() => onAdd("vet")}
      onRemove={(id) => deleteVetVisit(id).catch(swallow)}
    />
  );
}

export function MedsCard({ petId, onAdd }: { petId: string; onAdd: (k: AddKind) => void }) {
  const items = useMeds(petId);
  const rows = useMemo<RecordRowData[]>(
    () =>
      // No pause/resume: `meds` has no active column, so the toggle could never persist.
      [...items]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((m) => ({
          id: m.id,
          title: m.name,
          subtitle: [m.dose, m.schedule].filter(Boolean).join(" · ") || null,
        })),
    [items],
  );
  return (
    <RecordCard
      title="Medications"
rows={rows}
      emptyText="No medications. Add one to pick it when logging meds."
      addLabel="Add medication"
      onAdd={() => onAdd("med")}
      onRemove={(id) => deleteMed(id).catch(swallow)}
    />
  );
}
