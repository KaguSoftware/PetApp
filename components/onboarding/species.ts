import type { Species } from "@/data";
import type { IconName } from "@/ui";

export interface MainSpecies {
  /** Stored directly for dog/cat; "other" opens the extra list instead. */
  value: "dog" | "cat" | "other";
  label: string;
  icon: IconName;
}

export const MAIN_SPECIES: MainSpecies[] = [
  { value: "dog", label: "Dog", icon: "dog" },
  { value: "cat", label: "Cat", icon: "cat" },
  { value: "other", label: "Other", icon: "paw" },
];

export const OTHER_SPECIES: { value: Species; label: string }[] = [
  { value: "rabbit", label: "Rabbit" },
  { value: "bird", label: "Bird" },
  { value: "hamster", label: "Hamster" },
  { value: "reptile", label: "Reptile" },
  { value: "fish", label: "Fish" },
  { value: "other", label: "Something else" },
];

export function isMainSpecies(s: Species | null): s is "dog" | "cat" {
  return s === "dog" || s === "cat";
}
