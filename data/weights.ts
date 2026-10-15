import { randomUUID } from "expo-crypto";
import { useMemo } from "react";
import { cache, useTable } from "./cache";
import { supabase } from "./client";
import { allPages } from "./fetch";
import { toWeight } from "./mappers";
import { optimisticDelete, optimisticInsert, optimisticUpdate } from "./persist";
import type { WeightEntry } from "./types";

const query = (petIds: string[]) => supabase.from("weights").select("*").in("pet_id", petIds);

export async function loadWeights(petIds: string[]): Promise<void> {
  if (petIds.length === 0) return;
  const ep = cache.epoch();
  const rows = await allPages((from, to) => query(petIds).order("ts", { ascending: false }).order("id").range(from, to));
  if (cache.epoch() !== ep) return;
  cache.replaceAll("weights", rows.map(toWeight));
}

// weights has no server-set created_at to cursor on, and the table is small: refetch it whole.
export const resyncWeights = loadWeights;

/** Oldest first, ready for a chart. */
export function useWeights(petId: string): WeightEntry[] {
  const map = useTable("weights");
  return useMemo(() => [...map.values()].filter((w) => w.petId === petId).sort((a, b) => a.ts - b.ts), [map, petId]);
}

/** pets.weight_kg mirrors the newest weight entry. */
async function syncPetWeight(petId: string): Promise<void> {
  const latest = cache
    .all("weights")
    .filter((w) => w.petId === petId)
    .sort((a, b) => b.ts - a.ts)[0];
  const kg = latest?.kg ?? null;
  if (!cache.get("pets", petId)) return;
  await optimisticUpdate(
    "pets",
    petId,
    { weightKg: kg },
    () => supabase.from("pets").update({ weight_kg: kg ?? 0 }).eq("id", petId),
    "Couldn't update the pet's weight"
  );
}

export async function addWeight(petId: string, kg: number, ts: number = Date.now()): Promise<WeightEntry> {
  const entry: WeightEntry = { id: randomUUID(), petId, kg, ts };
  await optimisticInsert(
    "weights",
    entry,
    () => supabase.from("weights").insert({ id: entry.id, pet_id: petId, ts, kg }),
    "Couldn't save that weight",
    [petId]
  );
  await syncPetWeight(petId);
  return entry;
}

export async function deleteWeight(id: string): Promise<void> {
  const petId = cache.get("weights", id)?.petId;
  const ok = await optimisticDelete("weights", id, () => supabase.from("weights").delete().eq("id", id), "Couldn't delete that weight");
  if (ok && petId) await syncPetWeight(petId);
}
