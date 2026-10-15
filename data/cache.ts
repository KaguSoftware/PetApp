import { useSyncExternalStore } from "react";
import { createStore } from "./store";
import type { CareLog, Med, MemberCard, MemberLink, Pet, PetNote, Vaccination, VetVisit, WeightEntry } from "./types";

/** One Map<id,row> per table, replaced (never mutated) so hooks can compare by reference. */
export interface Tables {
  pets: Pet;
  activities: CareLog;
  weights: WeightEntry;
  vaccinations: Vaccination;
  vetVisits: VetVisit;
  meds: Med;
  notes: PetNote;
  members: MemberCard;
  links: MemberLink;
}
export type TableName = keyof Tables;
type Maps = { [K in TableName]: ReadonlyMap<string, Tables[K]> };

const TABLE_NAMES: TableName[] = ["pets", "activities", "weights", "vaccinations", "vetVisits", "meds", "notes", "members", "links"];

function emptyMaps(): Maps {
  const maps = {} as Record<TableName, ReadonlyMap<string, unknown>>;
  for (const t of TABLE_NAMES) maps[t] = new Map();
  return maps as Maps;
}

const store = createStore<Maps>(emptyMaps());

// Bumped on reset. Async work captures it and drops its result if it changed,
// so nothing from a previous user/household can land in the new cache.
let epoch = 0;
// Ids with a write in flight: replaceAll keeps them, realtime ignores deleted ones.
const pending = new Map<string, number>();
// Deleted ids: null = delete still in flight, number = expiry after the ack. Kept briefly
// past the ack so a fetch that started before the delete cannot bring the row back.
const tombstones = new Map<string, number | null>();
const TOMBSTONE_TTL_MS = 10_000;

function isTombstoned(id: string): boolean {
  if (!tombstones.has(id)) return false;
  const until = tombstones.get(id);
  if (until === null || until === undefined || until > Date.now()) return true;
  tombstones.delete(id);
  return false;
}
// Per-table sync cursors and other numeric bookkeeping (see data/household.ts).
let meta: Record<string, number> = {};

function write<K extends TableName>(table: K, next: ReadonlyMap<string, Tables[K]>) {
  store.set((s) => ({ ...s, [table]: next }));
}

export const cache = {
  epoch: () => epoch,
  subscribe: store.subscribe,

  get<K extends TableName>(table: K, id: string): Tables[K] | undefined {
    return store.get()[table].get(id);
  },
  all<K extends TableName>(table: K): Tables[K][] {
    return [...store.get()[table].values()];
  },
  map<K extends TableName>(table: K): ReadonlyMap<string, Tables[K]> {
    return store.get()[table];
  },

  upsert<K extends TableName>(table: K, row: Tables[K]): void {
    const next = new Map(store.get()[table]);
    next.set(row.id, row);
    write(table, next);
  },
  upsertMany<K extends TableName>(table: K, rows: Tables[K][]): void {
    if (rows.length === 0) return;
    const next = new Map(store.get()[table]);
    for (const r of rows) if (!isTombstoned(r.id)) next.set(r.id, r);
    write(table, next);
  },
  remove(table: TableName, id: string): void {
    const current = store.get()[table];
    if (!current.has(id)) return;
    const next = new Map(current as ReadonlyMap<string, unknown>);
    next.delete(id);
    write(table, next as never);
  },
  /** Drop everything a deleted pet owned (the DB cascades the same rows). */
  removePetChildren(petId: string): void {
    for (const table of ["activities", "weights", "vaccinations", "vetVisits", "meds", "notes"] as const) {
      const current = store.get()[table] as ReadonlyMap<string, { petId: string }>;
      const next = new Map([...current].filter(([, row]) => row.petId !== petId));
      if (next.size !== current.size) write(table, next as never);
    }
  },
  /**
   * Authoritative refetch; rows with writes in flight survive and tombstoned ids stay out.
   * With `inScope`, only rows it accepts are replaced: the rest of the table is kept
   * (a windowed reload must not evict older history).
   */
  replaceAll<K extends TableName>(table: K, rows: Tables[K][], inScope?: (row: Tables[K]) => boolean): void {
    const next = new Map<string, Tables[K]>();
    for (const r of rows) if (!isTombstoned(r.id)) next.set(r.id, r);
    for (const [id, row] of store.get()[table]) {
      if (next.has(id) || isTombstoned(id)) continue;
      if (pending.has(id) || (inScope && !inScope(row))) next.set(id, row);
    }
    write(table, next);
  },

  /** Realtime path: a self-echo is just the same id replacing itself. */
  mergeRemote<K extends TableName>(table: K, row: Tables[K]): void {
    if (isTombstoned(row.id)) return;
    cache.upsert(table, row);
  },

  markPending(id: string): void {
    pending.set(id, (pending.get(id) ?? 0) + 1);
  },
  unmarkPending(id: string): void {
    const n = (pending.get(id) ?? 1) - 1;
    if (n <= 0) pending.delete(id);
    else pending.set(id, n);
  },
  tombstone(id: string): void {
    tombstones.set(id, null);
  },
  /** The delete was acked: keep the tombstone a little longer, then let it expire. */
  releaseTombstone(id: string): void {
    tombstones.set(id, Date.now() + TOMBSTONE_TTL_MS);
  },
  /** The delete failed and the row is coming back. */
  untombstone(id: string): void {
    tombstones.delete(id);
  },
  isTombstoned,

  getMeta: (key: string): number | undefined => meta[key],
  setMeta(key: string, value: number): void {
    meta[key] = value;
  },
  /** Cursors only move forward. */
  bumpMeta(key: string, value: number): void {
    if (value > (meta[key] ?? -Infinity)) meta[key] = value;
  },

  reset(): void {
    epoch += 1;
    pending.clear();
    tombstones.clear();
    meta = {};
    store.set(emptyMaps());
  },
};

export function useTable<K extends TableName>(table: K): ReadonlyMap<string, Tables[K]> {
  return useSyncExternalStore(
    store.subscribe,
    () => store.get()[table],
    () => store.get()[table]
  );
}
