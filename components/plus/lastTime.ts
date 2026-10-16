// Pure "last time" status lines for the + panel rows. No React, no I/O.
import type { CareLog, CareType, Med, PetNote, WeightEntry } from "@/data";
import { calendarDaysBetween, clockTime, formatDate, kgValue, shortDate, type Units } from "@/lib/format";

export const NOT_YET = "Not yet";

/** "Just now", "12 min ago", "2h ago", "Yesterday", "3 days ago", then a short date. */
export function agoLabel(ts: number, now: number): string {
  const diff = now - ts;
  if (diff < 60_000) return "Just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const days = calendarDaysBetween(ts, now);
  if (days === 0) return `${Math.floor(mins / 60)}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return shortDate(ts, now);
}

function newest<T extends { ts: number }>(items: T[]): T | undefined {
  let best: T | undefined;
  for (const i of items) if (!best || i.ts > best.ts) best = i;
  return best;
}

/** Food / Water / Walk / Litter / Grooming. `logs` are the selected pet's. */
export function careStatus(logs: CareLog[], type: CareType, now: number): string {
  const last = newest(logs.filter((l) => l.type === type));
  return last ? agoLabel(last.ts, now) : NOT_YET;
}

/** "4.2 kg" / "9.3 lb"; hundredths for anything under 1 kg / 2 lb so small pets read right. */
export function weightText(kg: number, units: Units): string {
  const v = kgValue(kg, units);
  const digits = v < (units === "imperial" ? 2 : 1) ? 2 : 1;
  return `${Number(v.toFixed(digits))} ${units === "imperial" ? "lb" : "kg"}`;
}

export function weightStatus(weights: WeightEntry[], units: Units): string {
  const last = newest(weights);
  return last ? weightText(last.kg, units) : NOT_YET;
}

/** "Apoquel · 08:00" for the last meds log (a day word instead of the clock when it was not today). */
export function medsStatus(meds: Med[], logs: CareLog[], now: number): string {
  if (meds.length === 0) return "No meds yet";
  const last = newest(logs.filter((l) => l.type === "meds"));
  if (!last) return NOT_YET;
  const name = meds.find((m) => m.id === last.medId)?.name ?? "Meds";
  const when = calendarDaysBetween(last.ts, now) === 0 ? clockTime(last.ts) : agoLabel(last.ts, now);
  return `${name} · ${when}`;
}

export function noteStatus(notes: PetNote[], now: number): string {
  const last = newest(notes);
  return last ? agoLabel(last.ts, now) : NOT_YET;
}

/** Vet visit / Vaccination: the latest yyyy-mm-dd, as "12 Oct 2025". */
export function dateStatus(dates: string[]): string {
  const last = [...dates].sort().pop();
  return last ? formatDate(last) : NOT_YET;
}
