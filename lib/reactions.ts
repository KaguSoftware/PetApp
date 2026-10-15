import { useSyncExternalStore } from "react";
import type { MascotReactionType } from "@/components/mascot";
import type { CareType } from "@/data";

/** What just happened: a care type, a record, or a plain tap on the pet. */
export type ReactionSource = CareType | "weight" | "health" | "note" | "tap";

export interface LatestReaction {
  type: MascotReactionType;
  key: number;
  source: ReactionSource;
}

const MAP: Record<ReactionSource, MascotReactionType> = {
  fed: "eat",
  water: "drink",
  walk: "bounce",
  groomed: "love",
  litter: "wiggle",
  meds: "love",
  vet: "love",
  weight: "bounce",
  health: "bounce",
  note: "bounce",
  tap: "wiggle",
};

const latest = new Map<string, LatestReaction>();
const listeners = new Set<() => void>();
let counter = 0;

/** Fire a reaction for a pet; every mounted `useLatestReaction(petId)` updates. */
export function emitReaction({ petId, type }: { petId: string; type: ReactionSource }): void {
  latest.set(petId, { type: MAP[type], key: ++counter, source: type });
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Latest reaction for a pet, or undefined if none yet. Stable between emits. */
export function useLatestReaction(petId: string | undefined): LatestReaction | undefined {
  return useSyncExternalStore(
    subscribe,
    () => (petId ? latest.get(petId) : undefined),
    () => undefined,
  );
}
