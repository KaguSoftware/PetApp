import { randomUUID } from "expo-crypto";
import { useEffect, useMemo } from "react";
import { cache, useTable } from "./cache";
import { supabase } from "./client";
import { allPages } from "./fetch";
import { careLogPatchRow, careLogRow, createdAtMs, maxFinite, toCareLog, type Row } from "./mappers";
import { optimisticDelete, optimisticInsert, optimisticUpdate } from "./persist";
import { getMyLink, householdStore, requireHouseholdId, sessionStore } from "./state";
import { useStore } from "./store";
import type { CareLog, CareType } from "./types";

const DEFAULT_WINDOW_MS = 60 * 86_400_000;
const FLOOR = "logsFloor";
const CURSOR = "activities";

const columns = (householdId: string) => supabase.from("activities").select("*").eq("household_id", householdId);

// The resync cursor is the newest server-set created_at seen (epoch ms), not ts:
// ts is client-chosen, so a back-dated or offline-queued log would slip under a ts cursor.
const cursorOf = (rows: Row[], floor: number) => maxFinite(rows.map(createdAtMs), floor);

/** Initial load: the last 60 days, paginated. */
export async function loadLogs(householdId: string): Promise<void> {
  const ep = cache.epoch();
  const since = Date.now() - DEFAULT_WINDOW_MS;
  const rows = await allPages((from, to) =>
    columns(householdId).gte("ts", since).order("ts", { ascending: false }).order("id").range(from, to)
  );
  if (cache.epoch() !== ep) return;
  // Only the reloaded window is authoritative; older history already cached stays.
  cache.replaceAll("activities", rows.map(toCareLog), (l) => l.ts >= since);
  cache.setMeta(FLOOR, Math.min(cache.getMeta(FLOOR) ?? since, since));
  cache.bumpMeta(CURSOR, cursorOf(rows, since));
}

/** Reconnect / foreground: only rows created since the last one seen. */
export async function resyncLogs(householdId: string): Promise<void> {
  const ep = cache.epoch();
  const cursor = cache.getMeta(CURSOR) ?? Date.now() - DEFAULT_WINDOW_MS;
  const rows = await allPages((from, to) =>
    columns(householdId).gt("created_at", new Date(cursor).toISOString()).order("created_at", { ascending: false }).order("id").range(from, to)
  );
  if (cache.epoch() !== ep) return;
  cache.upsertMany("activities", rows.map(toCareLog));
  cache.bumpMeta(CURSOR, cursorOf(rows, cursor));
}

let older: Promise<void> = Promise.resolve();

/** Fetch history older than what is cached, on demand (useLogs with sinceMs). */
export function ensureLogsSince(sinceMs: number): Promise<void> {
  older = older.then(async () => {
    const householdId = householdStore.get().householdId;
    const floor = cache.getMeta(FLOOR);
    if (!householdId || floor === undefined || sinceMs >= floor) return;
    const ep = cache.epoch();
    try {
      const rows = await allPages((from, to) =>
        columns(householdId).gte("ts", sinceMs).lt("ts", floor).order("ts", { ascending: false }).order("id").range(from, to)
      );
      if (cache.epoch() !== ep) return;
      cache.upsertMany("activities", rows.map(toCareLog));
      cache.setMeta(FLOOR, sinceMs);
    } catch (e) {
      if (__DEV__) console.warn("[data] older logs fetch failed:", e);
    }
  });
  return older;
}

export function useLogs(opts?: { petId?: string; sinceMs?: number }): CareLog[] {
  const map = useTable("activities");
  const householdId = useStore(householdStore).householdId;
  const petId = opts?.petId;
  const sinceMs = opts?.sinceMs;
  useEffect(() => {
    if (householdId && sinceMs !== undefined) void ensureLogsSince(sinceMs);
  }, [householdId, sinceMs]);
  return useMemo(
    () =>
      [...map.values()]
        .filter((l) => (petId === undefined || l.petId === petId) && (sinceMs === undefined || l.ts >= sinceMs))
        .sort((a, b) => b.ts - a.ts),
    [map, petId, sinceMs]
  );
}

export async function logCare(
  petId: string,
  type: CareType,
  extra: { id?: string; grams?: number; medId?: string; durationMinutes?: number; note?: string; ts?: number } = {}
): Promise<CareLog> {
  const householdId = requireHouseholdId();
  const userId = sessionStore.get().userId;
  const log: CareLog = {
    // Callers may pre-generate the id so an Undo can be offered before the server acks.
    id: extra.id ?? randomUUID(),
    petId,
    memberId: getMyLink()?.memberId ?? null,
    type,
    ts: extra.ts ?? Date.now(),
    note: extra.note ?? null,
    grams: extra.grams ?? null,
    medId: extra.medId ?? null,
    durationMinutes: extra.durationMinutes ?? null,
  };
  // The cache insert is synchronous (instant UI); the write waits for a just-created pet/med row.
  return optimisticInsert(
    "activities",
    log,
    () => supabase.from("activities").insert(careLogRow(log, householdId, userId)),
    "Couldn't save that log",
    log.medId ? [petId, log.medId] : [petId]
  );
}

export async function editLog(id: string, patch: Partial<Pick<CareLog, "note" | "grams" | "durationMinutes" | "ts">>): Promise<void> {
  await optimisticUpdate(
    "activities",
    id,
    patch,
    () => supabase.from("activities").update(careLogPatchRow(patch)).eq("id", id),
    "Couldn't save the change"
  );
}

export async function deleteLog(id: string): Promise<void> {
  await optimisticDelete("activities", id, () => supabase.from("activities").delete().eq("id", id), "Couldn't delete that log");
}
