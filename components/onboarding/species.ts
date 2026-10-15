import type { Species } from "@/data";
import type { Tone } from "@/ui";

export interface MainSpecies {
  /** Stored directly for dog/cat; "other" opens the extra list instead. */
  value: "dog" | "cat" | "other";
  label: string;
  tone: Tone;
}

export const MAIN_SPECIES: MainSpecies[] = [
  { value: "dog", label: "Dog", tone: "butter" },
  { value: "cat", label: "Cat", tone: "ice" },
  { value: "other", label: "Other", tone: "pink" },
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
