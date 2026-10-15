import { randomUUID } from "expo-crypto";
import { useMemo } from "react";
import { cache, useTable } from "./cache";
import { supabase } from "./client";
import { rows } from "./fetch";
import { petInsertRow, petPatchRow, toPet } from "./mappers";
import { optimisticDelete, optimisticInsert, optimisticUpdate } from "./persist";
import { requireHouseholdId } from "./state";
import type { Pet } from "./types";
import { addWeight } from "./weights";

export async function loadPets(householdId: string): Promise<void> {
  const ep = cache.epoch();
  const data = await rows(supabase.from("pets").select("*").eq("household_id", householdId).order("created_at").order("id"));
  if (cache.epoch() !== ep) return;
  cache.replaceAll("pets", data.map(toPet));
}

export function usePets(): Pet[] {
  const map = useTable("pets");
  return useMemo(() => [...map.values()], [map]);
}

export function usePet(id: string): Pet | undefined {
  return useTable("pets").get(id);
}

export async function addPet(input: Omit<Pet, "id">): Promise<Pet> {
  const householdId = requireHouseholdId();
  const pet: Pet = { ...input, id: randomUUID() };
  await optimisticInsert(
    "pets",
    pet,
    () => supabase.from("pets").insert(petInsertRow(pet.id, householdId, input)),
    `${input.name} wasn't saved`
  );
  // Seed the weight chart; a failure here shows its own toast and leaves the pet.
  if (input.weightKg !== null) await addWeight(pet.id, input.weightKg).catch(() => undefined);
  return pet;
}

export async function editPet(id: string, patch: Partial<Omit<Pet, "id">>): Promise<void> {
  const { weightKg, ...rest } = patch;
  const row = petPatchRow(rest);
  const jobs: Promise<unknown>[] = [];
  if (Object.keys(row).length > 0) {
    jobs.push(
      optimisticUpdate("pets", id, rest, () => supabase.from("pets").update(row).eq("id", id), "Couldn't save pet changes")
    );
  }
  // A new weight goes through the weight log so the chart and pets.weight_kg agree.
  if (weightKg !== undefined && weightKg !== null && weightKg !== cache.get("pets", id)?.weightKg) {
    jobs.push(addWeight(id, weightKg).catch(() => undefined));
  }
  await Promise.all(jobs);
}

export async function deletePet(id: string): Promise<void> {
  const ok = await optimisticDelete("pets", id, () => supabase.from("pets").delete().eq("id", id), "Couldn't delete pet");
  if (ok) cache.removePetChildren(id);
}
