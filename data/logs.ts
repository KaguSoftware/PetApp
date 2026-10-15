import { randomUUID } from "expo-crypto";
import { useEffect, useMemo } from "react";
import { cache, useTable } from "./cache";
import { supabase } from "./client";
import { allPages } from "./fetch";
import { careLogPatchRow, careLogRow, toCareLog } from "./mappers";
import { optimisticDelete, optimisticInsert, optimisticUpdate } from "./persist";
import { getMyLink, householdStore, requireHouseholdId, sessionStore } from "./state";
import { useStore } from "./store";
import type { CareLog, CareType } from "./types";

const DEFAULT_WINDOW_MS = 60 * 86_400_000;
const FLOOR = "logsFloor";
const CURSOR = "activities";

const columns = (householdId: string) => supabase.from("activities").select("*").eq("household_id", householdId);

function ingest(rows: ReturnType<typeof toCareLog>[], ep: number) {
  if (cache.epoch() !== ep) return false;
  cache.upsertMany("activities", rows);
  for (const r of rows) cache.bumpMeta(CURSOR, r.ts);
  return true;
}

/** Initial load: the last 60 days, paginated. */
export async function loadLogs(householdId: string): Promise<void> {
  const ep = cache.epoch();
  const since = Date.now() - DEFAULT_WINDOW_MS;
  const rows = await allPages((from, to) =>
    columns(householdId).gte("ts", since).order("ts", { ascending: false }).order("id").range(from, to)
  );
  if (cache.epoch() !== ep) return;
  cache.replaceAll("activities", rows.map(toCareLog));
  cache.setMeta(FLOOR, since);
  cache.setMeta(CURSOR, Math.max(since, ...rows.map((r) => Number(r.ts))));
}

/** Reconnect / foreground: only rows newer than the last one seen. */
export async function resyncLogs(householdId: string): Promise<void> {
  const ep = cache.epoch();
  const cursor = cache.getMeta(CURSOR) ?? Date.now() - DEFAULT_WINDOW_MS;
  const rows = await allPages((from, to) =>
    columns(householdId).gt("ts", cursor).order("ts", { ascending: false }).order("id").range(from, to)
  );
  ingest(rows.map(toCareLog), ep);
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
  return optimisticInsert(
    "activities",
    log,
    () => supabase.from("activities").insert(careLogRow(log, householdId, userId)),
    "Couldn't save that log"
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
