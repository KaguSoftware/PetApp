import { randomUUID } from "expo-crypto";
import {
  addNote,
  addVaccination,
  addVetVisit,
  addWeight,
  deleteLog,
  deleteNote,
  deleteVaccination,
  deleteVetVisit,
  deleteWeight,
  logCare,
  showToast,
  type CareType,
  type Pet,
  type PetNote,
} from "@/data";
import { haptic } from "@/ui";
import { CARE_LABEL } from "./careMeta";

export interface LogExtra {
  grams?: number;
  durationMinutes?: number;
  medId?: string;
  note?: string;
  ts?: number;
}

const ignore = () => undefined;

/** Haptic + "Saved · Undo" bar. Failures are already toasted by the data layer. */
function saved(text: string, undo: () => Promise<unknown>) {
  haptic("success");
  showToast({ kind: "undo", text, actionLabel: "Undo", onAction: () => void undo().catch(ignore) });
}

/**
 * Logs one care entry. The id is generated here so Undo works instantly;
 * deleteLog waits for the insert to settle, so an early Undo can't race it.
 */
export function saveCare(pet: Pet, type: CareType, extra: LogExtra = {}, label: string = CARE_LABEL[type]) {
  const id = randomUUID();
  logCare(pet.id, type, { ...extra, id }).catch(ignore);
  saved(`${label} · ${pet.name}`, () => deleteLog(id));
}

export function saveWeight(pet: Pet, kg: number, shown: string) {
  const p = addWeight(pet.id, kg);
  p.catch(ignore);
  saved(`Weight ${shown} · ${pet.name}`, async () => {
    const w = await p;
    if (w?.id) await deleteWeight(w.id);
  });
}

export function saveNote(pet: Pet, kind: PetNote["kind"], body: string) {
  const p = addNote(pet.id, kind, body);
  p.catch(ignore);
  saved(`${kind === "symptom" ? "Symptom" : "Note"} · ${pet.name}`, async () => {
    const n = await p;
    if (n?.id) await deleteNote(n.id);
  });
}

export function saveVetVisit(pet: Pet, v: { date: string; reason: string; notes: string | null }) {
  const p = addVetVisit({ petId: pet.id, ...v });
  p.catch(ignore);
  saved(`Vet visit · ${pet.name}`, async () => {
    const r = await p;
    if (r?.id) await deleteVetVisit(r.id);
  });
}

export function saveVaccination(pet: Pet, v: { name: string; date: string; nextDue: string | null }) {
  const p = addVaccination({ petId: pet.id, ...v });
  p.catch(ignore);
  saved(`${v.name} · ${pet.name}`, async () => {
    const r = await p;
    if (r?.id) await deleteVaccination(r.id);
  });
}
