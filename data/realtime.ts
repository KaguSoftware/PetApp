import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { AppState, type AppStateStatus, type NativeEventSubscription } from "react-native";
import { cache, type TableName, type Tables } from "./cache";
import { supabase } from "./client";
import {
  createdAtMs,
  toCareLog,
  toMemberCard,
  toMemberLink,
  toMed,
  toNote,
  toPet,
  toVaccination,
  toVetVisit,
  toWeight,
  type Row,
} from "./mappers";

export interface RealtimeOptions {
  householdId: string;
  userId: string;
  /**
   * Catch up after a gap. `full` = reload the cached window instead of fetching past the cursor;
   * `force` = skip the throttle. Resolves false when the catch-up failed.
   */
  onResync: (full: boolean, force: boolean) => Promise<boolean>;
  /** The channel is being torn down; drop any resync bookkeeping. */
  onStop?: () => void;
  onHouseholdRow: (row: Row) => void;
  /** The signed-in user's own household_members row was deleted. */
  onMembershipLost: () => void;
}

type Payload = RealtimePostgresChangesPayload<Row>;

interface Binding<K extends TableName> {
  db: string;
  table: K;
  scope: "household" | "pet";
  map: (r: Row) => Tables[K];
  /** Large columns Postgres leaves out of UPDATE payloads when unchanged (TOAST): column -> field. */
  toasted?: Record<string, string>;
}

const BINDINGS: Binding<TableName>[] = [
  { db: "activities", table: "activities", scope: "household", map: toCareLog, toasted: { note: "note" } },
  { db: "pets", table: "pets", scope: "household", map: toPet, toasted: { notes: "notes" } },
  { db: "members", table: "members", scope: "household", map: toMemberCard },
  { db: "household_members", table: "links", scope: "household", map: toMemberLink },
  { db: "pet_notes", table: "notes", scope: "household", map: toNote, toasted: { body: "body" } },
  { db: "weights", table: "weights", scope: "pet", map: toWeight },
  { db: "vaccinations", table: "vaccinations", scope: "pet", map: toVaccination, toasted: { notes: "notes" } },
  { db: "vet_visits", table: "vetVisits", scope: "pet", map: toVetVisit, toasted: { notes: "notes", reason: "reason" } },
  { db: "meds", table: "meds", scope: "pet", map: toMed },
] as Binding<TableName>[];

const REBUILD_DEBOUNCE_MS = 400;
// Past this long offline, incremental catch-up is not trusted (back-dated rows, missed deletes).
const FULL_RELOAD_AFTER_MS = 5 * 60_000;

let options: RealtimeOptions | null = null;
let channel: RealtimeChannel | null = null;
let generation = 0;
let needsResync = false;
let petKey = "";
let petsRef: unknown = null;
let rebuildTimer: ReturnType<typeof setTimeout> | null = null;
let unsubscribeCache: (() => void) | null = null;
let appStateSub: NativeEventSubscription | null = null;
// When we last stopped hearing from the server (backgrounded or channel down); null while live.
let offlineSince: number | null = null;

function resyncNow() {
  const o = options;
  if (!o) return;
  const full = offlineSince !== null && Date.now() - offlineSince > FULL_RELOAD_AFTER_MS;
  // A catch-up we owe (first connect, reconnect, new pets) must not be eaten by the throttle.
  const force = needsResync;
  offlineSince = null;
  needsResync = false;
  void o.onResync(full, force).then((ok) => {
    if (!ok && options === o) needsResync = true;
  });
}

// An UPDATE payload may omit unchanged TOASTed columns; the mapper would turn those into
// defaults and wipe the cached value, so keep the cached one for every absent key.
function mergeUpdate(binding: Binding<TableName>, raw: Row, mapped: Tables[TableName]): Tables[TableName] {
  const cached = cache.get(binding.table, mapped.id) as Record<string, unknown> | undefined;
  if (!cached || !binding.toasted) return mapped;
  const merged = { ...mapped } as Record<string, unknown>;
  for (const [column, field] of Object.entries(binding.toasted)) if (!(column in raw)) merged[field] = cached[field];
  return merged as unknown as Tables[TableName];
}

function handleUpsert(binding: Binding<TableName>, payload: Payload) {
  const mapped = binding.map(payload.new);
  const row = payload.eventType === "UPDATE" ? mergeUpdate(binding, payload.new, mapped) : mapped;
  cache.mergeRemote(binding.table, row);
  if (binding.table === "activities") cache.bumpMeta("activities", createdAtMs(payload.new));
}

// DELETE events cannot be filtered and, under RLS, carry only primary-key columns,
// so the listener is unfiltered and acts only on ids that are in the cache.
function handleDelete(binding: Binding<TableName>, payload: Payload) {
  const o = options;
  const old = payload.old as Row | undefined;
  if (!o || !old) return;
  if (binding.table === "links") {
    // household_members has a composite key (household_id, user_id).
    if (old.household_id !== o.householdId || typeof old.user_id !== "string") return;
    if (!cache.get("links", old.user_id)) return;
    cache.remove("links", old.user_id);
    if (old.user_id === o.userId) o.onMembershipLost();
    return;
  }
  const id = old.id;
  if (typeof id !== "string" || !cache.get(binding.table, id)) return;
  cache.remove(binding.table, id);
  if (binding.table === "pets") cache.removePetChildren(id);
}

function connect() {
  const o = options;
  if (!o) return;
  closeChannel();
  const gen = ++generation;
  const petIds = cache.all("pets").map((p) => p.id).sort();
  petKey = petIds.join(",");

  let ch = supabase.channel(`household:${o.householdId}:${gen}`);
  for (const b of BINDINGS) {
    const filter = b.scope === "household" ? `household_id=eq.${o.householdId}` : `pet_id=in.(${petKey})`;
    if (b.scope === "pet" && petIds.length === 0) continue;
    for (const event of ["INSERT", "UPDATE"] as const) {
      ch = ch.on("postgres_changes", { event, schema: "public", table: b.db, filter }, (p: Payload) => {
        touch();
        handleUpsert(b, p);
      });
    }
    ch = ch.on("postgres_changes", { event: "DELETE", schema: "public", table: b.db }, (p: Payload) => {
      touch();
      handleDelete(b, p);
    });
  }
  ch = ch.on(
    "postgres_changes",
    { event: "UPDATE", schema: "public", table: "households", filter: `id=eq.${o.householdId}` },
    (p: Payload) => {
      touch();
      o.onHouseholdRow(p.new);
    }
  );

  channel = ch;
  // A channel joined while the client still holds the anon key is RLS-evaluated
  // as anon and receives nothing; supabase-js refreshes tokens after that itself.
  void supabase.realtime
    .setAuth()
    .catch(() => undefined)
    .then(() => {
      if (gen !== generation) return;
      ch.subscribe((status) => {
        if (gen !== generation) return;
        if (status === "SUBSCRIBED") {
          if (needsResync) resyncNow();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          needsResync = true;
          offlineSince ??= Date.now();
        }
      });
    });
}

function touch() {
  offlineSince = null;
}

function closeChannel() {
  generation += 1;
  if (channel) void supabase.removeChannel(channel);
  channel = null;
}

// The pet-scoped tables filter on pet ids, so the channel is rebuilt when the pet set changes.
function onCacheChange() {
  const pets = cache.map("pets");
  if (pets === petsRef) return;
  petsRef = pets;
  const key = [...pets.keys()].sort().join(",");
  if (key === petKey) return;
  if (rebuildTimer) clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    rebuildTimer = null;
    needsResync = true; // rows for a new pet may have landed before the filter did
    connect();
  }, REBUILD_DEBOUNCE_MS);
}

function onAppState(status: AppStateStatus) {
  if (!options) return;
  if (status !== "active") {
    offlineSince ??= Date.now();
    return;
  }
  if (!supabase.realtime.isConnected()) supabase.realtime.connect();
  resyncNow();
}

export function startRealtime(opts: RealtimeOptions): void {
  stopRealtime();
  options = opts;
  needsResync = true; // the first SUBSCRIBED catches up on whatever landed during the initial load
  offlineSince = null;
  petsRef = cache.map("pets");
  connect();
  unsubscribeCache = cache.subscribe(onCacheChange);
  appStateSub = AppState.addEventListener("change", onAppState);
}

export function stopRealtime(): void {
  options?.onStop?.();
  options = null;
  needsResync = false;
  offlineSince = null;
  if (rebuildTimer) clearTimeout(rebuildTimer);
  rebuildTimer = null;
  unsubscribeCache?.();
  unsubscribeCache = null;
  appStateSub?.remove();
  appStateSub = null;
  closeChannel();
}
