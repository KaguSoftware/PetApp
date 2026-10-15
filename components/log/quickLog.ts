import { randomUUID } from "expo-crypto";
import { deleteLog, logCare, showToast, type CareType, type Pet } from "@/data";
import { emitReaction } from "@/lib/reactions";
import { CARE } from "./careMeta";

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
export function quickLog(pets: Pet[], type: CareType, extra?: LogExtra): void {
  if (pets.length === 0) return;
  const meta = CARE[type];
  const ids = pets.map((p) => {
    const id = randomUUID();
    logCare(p.id, type, { ...extra, id }).catch(() => undefined);
    emitReaction({ petId: p.id, type });
    return id;
  });
  const text = pets.length > 1 ? `${meta.label} logged for all pets ✓` : `${pets[0].name} ${meta.done} ✓`;
  showToast({
    kind: "undo",
    text,
    actionLabel: "Undo",
    onAction: () => {
      for (const id of ids) deleteLog(id).catch(() => undefined);
    },
  });
}
