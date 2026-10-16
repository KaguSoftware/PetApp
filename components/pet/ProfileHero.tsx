import type { Pet } from "@/data";
import { ageLabel } from "@/lib/format";
import { Text } from "@/ui";

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** The native header carries the name; this is the grey line under it. */
export function ProfileHero({ pet }: { pet: Pet }) {
  const age = ageLabel(pet.birthDate);
  const line = [cap(pet.species), pet.breed, age].filter(Boolean).join(" · ");
  return <Text tone="ink2">{line}</Text>;
}
