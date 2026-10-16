// Pure model for Home's "Today" list: care logs, weights and notes merged, newest first.
import type { CareLog, Med, PetNote, WeightEntry } from "@/data";
import type { Units } from "@/lib/format";
import { CARE_LABEL } from "@/components/plus/careMeta";
import { weightText } from "@/components/plus/lastTime";

export interface TodayItem {
  id: string;
  title: string;
  ts: number;
  memberId: string | null;
}

export function startOfToday(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function careTitle(l: CareLog, meds: Med[]): string {
  const base = CARE_LABEL[l.type];
  if (l.type === "fed" && l.grams) return `${base} · ${l.grams} g`;
  if (l.type === "walk" && l.durationMinutes) return `${base} · ${l.durationMinutes} min`;
  if (l.type === "meds") {
    const name = meds.find((m) => m.id === l.medId)?.name;
    return name ? `${base} · ${name}` : base;
  }
  return base;
}

export function todayItems(input: {
  logs: CareLog[];
  weights: WeightEntry[];
  notes: PetNote[];
  meds: Med[];
  units: Units;
  now: number;
}): TodayItem[] {
  const from = startOfToday(input.now);
  const items: TodayItem[] = [
    ...input.logs.map((l) => ({ id: `l-${l.id}`, title: careTitle(l, input.meds), ts: l.ts, memberId: l.memberId })),
    ...input.weights.map((w) => ({ id: `w-${w.id}`, title: `Weight · ${weightText(w.kg, input.units)}`, ts: w.ts, memberId: null })),
    ...input.notes.map((n) => ({ id: `n-${n.id}`, title: n.kind === "symptom" ? "Symptom" : "Note", ts: n.ts, memberId: n.memberId })),
  ];
  return items.filter((i) => i.ts >= from).sort((a, b) => b.ts - a.ts);
}
