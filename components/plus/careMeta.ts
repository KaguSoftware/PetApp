import type { CareType, Species } from "@/data";
import type { IconName } from "@/ui";

/** Every form the + panel can open. Care types keep their data-layer name. */
export type FormId = CareType | "weight" | "note" | "vaccination";

export interface RowDef {
  title: string;
  icon: IconName;
}

export const ROW: Record<FormId, RowDef> = {
  fed: { title: "Food", icon: "food" },
  water: { title: "Water", icon: "water" },
  walk: { title: "Walk", icon: "walk" },
  litter: { title: "Litter", icon: "litter" },
  groomed: { title: "Grooming", icon: "groom" },
  meds: { title: "Meds", icon: "meds" },
  vet: { title: "Vet visit", icon: "vet" },
  weight: { title: "Weight", icon: "weight" },
  note: { title: "Note", icon: "note" },
  vaccination: { title: "Vaccination", icon: "vaccine" },
};

/** Toast / Today wording for a care log, e.g. "Fed". */
export const CARE_LABEL: Record<CareType, string> = {
  fed: "Fed",
  water: "Water",
  walk: "Walk",
  litter: "Litter",
  groomed: "Groomed",
  meds: "Meds",
  vet: "Vet visit",
};

const LITTER_SPECIES: Species[] = ["cat", "rabbit", "hamster", "other"];

/** Whether a species has this daily care type (walk: dogs; litter: cats and small pets). */
export function supportsCare(species: Species, type: CareType): boolean {
  if (type === "walk") return species === "dog";
  if (type === "litter") return LITTER_SPECIES.includes(species);
  return true;
}

/** The walk-or-litter row that earns a place on the first level, if the species has one. */
function primaryOutdoor(species: Species): FormId | null {
  if (supportsCare(species, "walk")) return "walk";
  if (supportsCare(species, "litter")) return "litter";
  return null;
}

/** Level 1 rows in order, without the trailing "More" row. */
export function rootRows(species: Species): FormId[] {
  const outdoor = primaryOutdoor(species);
  return ["fed", "water", ...(outdoor ? [outdoor] : []), "weight", "meds", "note"];
}

/** The "More" level: vet, vaccination, grooming, plus the other of walk/litter when the species has both. */
export function moreRows(species: Species): FormId[] {
  const outdoor = primaryOutdoor(species);
  const other = (["walk", "litter"] as const).find((t) => t !== outdoor && supportsCare(species, t));
  return ["vet", "vaccination", "groomed", ...(other ? [other] : [])];
}

export function formAllowed(species: Species, id: FormId): boolean {
  return rootRows(species).includes(id) || moreRows(species).includes(id);
}

const STEPS: Record<string, FormId> = {
  food: "fed",
  water: "water",
  walk: "walk",
  litter: "litter",
  groom: "groomed",
  weight: "weight",
  meds: "meds",
  note: "note",
  vet: "vet",
  vaccination: "vaccination",
};

/** `/log?step=` value to a form; null for anything unknown. */
export function formFromStep(step: string | undefined): FormId | null {
  return step ? (STEPS[step] ?? null) : null;
}
