import { randomUUID } from "expo-crypto";
import { deleteLog, logCare, showToast, type CareType, type Pet } from "@/data";
import { CARE, supportsCare } from "./careMeta";

function joinNames(names: string[]): string {
  if (names.length > 3) return `${names.length} pets`;
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

export interface LogExtra {
  grams?: number;
  durationMinutes?: number;
  note?: string;
  ts?: number;
}

/**
 * Logs one care type for one or more pets. Ids are generated here so the pet
 * reacts and the Undo toast shows instantly; deleteLog waits for each insert to
 * settle, so an early Undo can't race it. Failures are toasted by the data layer.
 */
export function quickLog(allPets: Pet[], type: CareType, extra?: LogExtra): void {
  // "All pets" only logs for the pets this care type applies to (no walks for the cat).
  const pets = allPets.filter((p) => supportsCare(p.species, type));
  if (pets.length === 0) return;
  const meta = CARE[type];
  const ids = pets.map((p) => {
    const id = randomUUID();
    logCare(p.id, type, { ...extra, id }).catch(() => undefined);
    return id;
  });
  const text = `${joinNames(pets.map((p) => p.name))} ${meta.done} ✓`;
  showToast({
    kind: "undo",
    text,
    actionLabel: "Undo",
    onAction: () => {
      for (const id of ids) deleteLog(id).catch(() => undefined);
    },
  });
}
