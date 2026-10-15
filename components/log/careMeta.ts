import type { CareType, Species } from "@/data";
import type { IconName, Tone } from "@/ui";

export interface CareMeta {
  type: CareType;
  label: string;
  icon: IconName;
  tone: Tone;
  /** Completes "{Name} …" in the undo toast. */
  done: string;
}

export const CARE: Record<CareType, CareMeta> = {
  fed: { type: "fed", label: "Fed", icon: "fed", tone: "butter", done: "fed" },
  water: { type: "water", label: "Water", icon: "water", tone: "ice", done: "had water" },
  walk: { type: "walk", label: "Walk", icon: "walk", tone: "mint", done: "walked" },
  litter: { type: "litter", label: "Litter", icon: "litter", tone: "grey", done: "litter cleaned" },
  groomed: { type: "groomed", label: "Groomed", icon: "groom", tone: "pink", done: "groomed" },
  meds: { type: "meds", label: "Meds", icon: "pill", tone: "peach", done: "got meds" },
  vet: { type: "vet", label: "Vet", icon: "vet", tone: "ice", done: "visited the vet" },
};

const ORDER: CareType[] = ["fed", "water", "walk", "litter", "groomed", "meds", "vet"];
const LITTER_SPECIES: Species[] = ["cat", "rabbit", "hamster", "other"];

/** Daily care types shown when logging for these species (walk: dogs; litter: cats and small pets). */
export function careTypesFor(species: Species[]): CareMeta[] {
  return ORDER.filter((t) => {
    if (t === "walk") return species.includes("dog");
    if (t === "litter") return species.some((s) => LITTER_SPECIES.includes(s));
    return true;
  }).map((t) => CARE[t]);
}
