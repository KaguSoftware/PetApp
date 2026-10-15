import { randomUUID } from "expo-crypto";
import { useMemo } from "react";
import { cache, useTable } from "./cache";
import { supabase } from "./client";
import { allPages } from "./fetch";
import { medPatchRow, medRow, toMed, toVaccination, toVetVisit, vaccinationRow, vetVisitRow } from "./mappers";
import { optimisticDelete, optimisticInsert, optimisticUpdate } from "./persist";
import type { Med, Vaccination, VetVisit } from "./types";

// These tables have no household_id; RLS scopes them through the pet.
export async function loadHealth(petIds: string[]): Promise<void> {
  if (petIds.length === 0) return;
  const ep = cache.epoch();
  const [vacc, visits, meds] = await Promise.all([
    allPages((from, to) => supabase.from("vaccinations").select("*").in("pet_id", petIds).order("id").range(from, to)),
    allPages((from, to) => supabase.from("vet_visits").select("*").in("pet_id", petIds).order("id").range(from, to)),
    allPages((from, to) => supabase.from("meds").select("*").in("pet_id", petIds).order("id").range(from, to)),
  ]);
  if (cache.epoch() !== ep) return;
  cache.replaceAll("vaccinations", vacc.map(toVaccination));
  cache.replaceAll("vetVisits", visits.map(toVetVisit));
  cache.replaceAll("meds", meds.map(toMed));
}

export function useVaccinations(petId: string): Vaccination[] {
  const map = useTable("vaccinations");
  return useMemo(() => [...map.values()].filter((v) => v.petId === petId).sort((a, b) => b.date.localeCompare(a.date)), [map, petId]);
}

export function useVetVisits(petId: string): VetVisit[] {
  const map = useTable("vetVisits");
  return useMemo(() => [...map.values()].filter((v) => v.petId === petId).sort((a, b) => b.date.localeCompare(a.date)), [map, petId]);
}

export function useMeds(petId?: string): Med[] {
  const map = useTable("meds");
  return useMemo(
    () => [...map.values()].filter((m) => petId === undefined || m.petId === petId).sort((a, b) => a.name.localeCompare(b.name)),
    [map, petId]
  );
}

export async function addVaccination(v: Omit<Vaccination, "id">): Promise<Vaccination> {
  const item: Vaccination = { ...v, id: randomUUID() };
  return optimisticInsert(
    "vaccinations",
    item,
    () => supabase.from("vaccinations").insert(vaccinationRow(item)),
    "Couldn't save the vaccination",
    [v.petId]
  );
}

export async function addVetVisit(v: Omit<VetVisit, "id">): Promise<VetVisit> {
  const item: VetVisit = { ...v, id: randomUUID() };
  return optimisticInsert("vetVisits", item, () => supabase.from("vet_visits").insert(vetVisitRow(item)), "Couldn't save the vet visit", [v.petId]);
}

export async function addMed(m: Omit<Med, "id">): Promise<Med> {
  const item: Med = { ...m, id: randomUUID() };
  return optimisticInsert("meds", item, () => supabase.from("meds").insert(medRow(item)), `Couldn't save ${m.name}`, [m.petId]);
}

// `active` is kept in the type for callers but is always true (no column): it is never
// persisted, so it is also kept out of the cache rather than showing a state the server lacks.
export async function editMed(id: string, patch: Partial<Omit<Med, "id" | "petId">>): Promise<void> {
  const row = medPatchRow(patch);
  if (Object.keys(row).length === 0) return;
  const { active: _active, ...persisted } = patch;
  await optimisticUpdate("meds", id, persisted, () => supabase.from("meds").update(row).eq("id", id), "Couldn't update the medication");
}

export async function deleteVaccination(id: string): Promise<void> {
  await optimisticDelete("vaccinations", id, () => supabase.from("vaccinations").delete().eq("id", id), "Couldn't delete that");
}

export async function deleteVetVisit(id: string): Promise<void> {
  await optimisticDelete("vetVisits", id, () => supabase.from("vet_visits").delete().eq("id", id), "Couldn't delete that");
}

export async function deleteMed(id: string): Promise<void> {
  await optimisticDelete("meds", id, () => supabase.from("meds").delete().eq("id", id), "Couldn't delete that");
}
