import { randomUUID } from "expo-crypto";
import { useMemo } from "react";
import { cache, useTable } from "./cache";
import { supabase } from "./client";
import { allPages, FetchError } from "./fetch";
import { toNote } from "./mappers";
import { optimisticDelete, optimisticInsert } from "./persist";
import { getMyLink, requireHouseholdId } from "./state";
import type { PetNote } from "./types";

const CURSOR = "notes";
let warnedMissing = false;

// The one schema tolerance in the data layer: pet_notes arrives with a newer
// migration than the rest, so a missing table (42P01) reads as "no notes".
async function fetchNotes(householdId: string, afterCreatedAt?: string) {
  try {
    return await allPages((from, to) => {
      let q = supabase.from("pet_notes").select("*").eq("household_id", householdId);
      if (afterCreatedAt) q = q.gt("created_at", afterCreatedAt);
      return q.order("created_at", { ascending: false }).order("id").range(from, to);
    });
  } catch (e) {
    if (e instanceof FetchError && e.code === "42P01") {
      if (__DEV__ && !warnedMissing) {
        warnedMissing = true;
        console.warn("[data] pet_notes table is missing; notes are empty until the migration is applied");
      }
      return [];
    }
    throw e;
  }
}

function noteCursor(rows: { created_at?: unknown }[], fallback: number): number {
  return Math.max(fallback, ...rows.map((r) => Date.parse(String(r.created_at))).filter(Number.isFinite));
}

export async function loadNotes(householdId: string): Promise<void> {
  const ep = cache.epoch();
  const rows = await fetchNotes(householdId);
  if (cache.epoch() !== ep) return;
  cache.replaceAll("notes", rows.map(toNote));
  cache.setMeta(CURSOR, noteCursor(rows, 0));
}

export async function resyncNotes(householdId: string): Promise<void> {
  const ep = cache.epoch();
  const cursor = cache.getMeta(CURSOR) ?? 0;
  const rows = await fetchNotes(householdId, new Date(cursor).toISOString());
  if (cache.epoch() !== ep) return;
  cache.upsertMany("notes", rows.map(toNote));
  cache.setMeta(CURSOR, noteCursor(rows, cursor));
}

/** Newest first. */
export function useNotes(petId?: string): PetNote[] {
  const map = useTable("notes");
  return useMemo(
    () => [...map.values()].filter((n) => petId === undefined || n.petId === petId).sort((a, b) => b.ts - a.ts),
    [map, petId]
  );
}

export async function addNote(petId: string, kind: PetNote["kind"], body: string, ts: number = Date.now()): Promise<PetNote> {
  const householdId = requireHouseholdId();
  const note: PetNote = { id: randomUUID(), petId, memberId: getMyLink()?.memberId ?? null, kind, body, ts };
  // user_id is set by the server.
  return optimisticInsert(
    "notes",
    note,
    () =>
      supabase.from("pet_notes").insert({ id: note.id, household_id: householdId, pet_id: petId, member_id: note.memberId, ts, kind, body }),
    "Couldn't save that note"
  );
}

export async function deleteNote(id: string): Promise<void> {
  await optimisticDelete("notes", id, () => supabase.from("pet_notes").delete().eq("id", id), "Couldn't delete that note");
}
