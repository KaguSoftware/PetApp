import type { MascotMood } from "@/components/mascot";
import type { CareLog, CareType, Pet } from "@/data";

const HOUR = 3_600_000;

const HUNGRY_AFTER_H = 10;
const THIRSTY_AFTER_H = 12;
const GRUMPY_AFTER_H = 36;
const HAPPY_WITHIN_H = 2;

export interface Mood {
  mood: MascotMood;
  reason: string;
}

/** Newest ts of a care type for this pet, or null when it was never logged. */
function lastOf(logs: CareLog[], petId: string, type: CareType): number | null {
  let best: number | null = null;
  for (const l of logs) {
    if (l.petId === petId && l.type === type && (best === null || l.ts > best)) best = l.ts;
  }
  return best;
}

const hoursSince = (ts: number | null, now: number) => (ts === null ? Infinity : (now - ts) / HOUR);

function startOfLocalDay(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Derives the pet's mood from its care logs. Pure and species-aware. Moods are
 * gentle: a need that was never logged for this pet is never nagged about
 * (except food, once the pet has any history), so new users see a content pet.
 */
export function computeMood(pet: Pick<Pet, "id" | "species">, logs: CareLog[], now: number): Mood {
  const mine = logs.filter((l) => l.petId === pet.id);
  if (mine.length === 0) return { mood: "content", reason: "No logs yet" };

  const fedH = hoursSince(lastOf(mine, pet.id, "fed"), now);
  if (fedH > HUNGRY_AFTER_H) return { mood: "hungry", reason: "No meal logged for a while" };

  const water = lastOf(mine, pet.id, "water");
  if (water !== null && hoursSince(water, now) > THIRSTY_AFTER_H) {
    return { mood: "thirsty", reason: "Water was last logged a while ago" };
  }

  const hour = new Date(now).getHours();
  if (pet.species === "dog" && hour >= 12) {
    const walk = lastOf(mine, pet.id, "walk");
    if (walk === null || walk < startOfLocalDay(now)) return { mood: "restless", reason: "No walk yet today" };
  }

  if (pet.species === "cat") {
    const litter = lastOf(mine, pet.id, "litter");
    if (litter !== null && hoursSince(litter, now) > GRUMPY_AFTER_H) {
      return { mood: "grumpy", reason: "Litter box is due" };
    }
  }

  if (hour >= 22 || hour < 6) return { mood: "sleepy", reason: "Night time and everything is taken care of" };

  const newest = mine.reduce((m, l) => Math.max(m, l.ts), 0);
  if (hoursSince(newest, now) <= HAPPY_WITHIN_H) return { mood: "happy", reason: "Cared for in the last 2 hours" };

  return { mood: "content", reason: "All good" };
}
