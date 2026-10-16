import type { CareLog, CareType, Med, PetNote, Vaccination, VetVisit, WeightEntry } from "@/data";
import { dayLabel, kgToDisplay, type Units } from "@/lib/format";
import type { IconName } from "@/ui";

export type Category = "care" | "weight" | "health" | "notes";
export type CategoryFilter = "all" | Category;

export type HistorySource =
  | { kind: "care"; log: CareLog }
  | { kind: "weight"; entry: WeightEntry }
  | { kind: "vaccination"; record: Vaccination }
  | { kind: "vet"; record: VetVisit }
  | { kind: "note"; note: PetNote };

export interface HistoryItem {
  key: string;
  ts: number;
  petId: string;
  memberId: string | null;
  category: Category;
  icon: IconName;
  tone: string;
  title: string;
  /** Extra line (note text, reason...) shown under the title. */
  detail: string | null;
  source: HistorySource;
}

export interface PetFeed {
  weights: WeightEntry[];
  vaccinations: Vaccination[];
  vetVisits: VetVisit[];
}

export interface HistoryInput {
  logs: CareLog[];
  notes: PetNote[];
  meds: Med[];
  feeds: Record<string, PetFeed>;
  petNames: Record<string, string>;
  units: Units;
  sinceMs: number;
}

export interface HistorySection {
  title: string;
  data: HistoryItem[];
}

const CARE: Record<CareType, { icon: IconName; tone: string; verb: (pet: string) => string }> = {
  fed: { icon: "fed", tone: "butter", verb: (p) => `Fed ${p}` },
  water: { icon: "water", tone: "ice", verb: (p) => `Water for ${p}` },
  walk: { icon: "walk", tone: "mint", verb: (p) => `Walked ${p}` },
  litter: { icon: "litter", tone: "grey", verb: (p) => `Litter for ${p}` },
  groomed: { icon: "groom", tone: "pink", verb: (p) => `Groomed ${p}` },
  meds: { icon: "pill", tone: "peach", verb: (p) => `Meds for ${p}` },
  vet: { icon: "vet", tone: "ice", verb: (p) => `Vet visit for ${p}` },
};

/** yyyy-mm-dd to local noon, so a date-only record lands mid-day in its own day group. */
export function dateToNoon(date: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return Number.NaN;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12).getTime();
}

function careItem(log: CareLog, pet: string, meds: Map<string, Med>): HistoryItem {
  const c = CARE[log.type];
  const extras: string[] = [];
  if (log.type === "fed" && log.grams) extras.push(`${log.grams} g`);
  if (log.durationMinutes) extras.push(`${log.durationMinutes} min`);
  const med = log.medId ? meds.get(log.medId) : undefined;
  if (med) extras.push(med.name);
  if (log.note) extras.push(log.note);
  return {
    key: `c:${log.id}`,
    ts: log.ts,
    petId: log.petId,
    memberId: log.memberId,
    category: "care",
    icon: c.icon,
    tone: c.tone,
    title: c.verb(pet),
    detail: extras.length ? extras.join(" · ") : null,
    source: { kind: "care", log },
  };
}

/** Merge every record type into one newest-first list inside the time window. */
export function buildItems(input: HistoryInput): HistoryItem[] {
  const { logs, notes, meds, feeds, petNames, units, sinceMs } = input;
  const nameOf = (id: string) => petNames[id] ?? "your pet";
  const medMap = new Map(meds.map((m) => [m.id, m]));
  const items: HistoryItem[] = [];

  for (const log of logs) if (petNames[log.petId] !== undefined) items.push(careItem(log, nameOf(log.petId), medMap));

  for (const note of notes) {
    if (petNames[note.petId] === undefined || note.ts < sinceMs) continue;
    const symptom = note.kind === "symptom";
    items.push({
      key: `n:${note.id}`,
      ts: note.ts,
      petId: note.petId,
      memberId: note.memberId,
      category: symptom ? "health" : "notes",
      icon: symptom ? "health" : "note",
      tone: symptom ? "pink" : "butter",
      title: symptom ? `Symptom: ${note.body}` : `Note for ${nameOf(note.petId)}`,
      detail: symptom ? null : note.body,
      source: { kind: "note", note },
    });
  }

  for (const [petId, feed] of Object.entries(feeds)) {
    if (petNames[petId] === undefined) continue;
    for (const w of feed.weights) {
      if (w.ts < sinceMs) continue;
      items.push({
        key: `w:${w.id}`,
        ts: w.ts,
        petId,
        memberId: null,
        category: "weight",
        icon: "weight",
        tone: "mint",
        title: `Weight · ${kgToDisplay(w.kg, units)}`,
        detail: null,
        source: { kind: "weight", entry: w },
      });
    }
    for (const v of feed.vaccinations) {
      const ts = dateToNoon(v.date);
      if (!Number.isFinite(ts) || ts < sinceMs) continue;
      items.push({
        key: `v:${v.id}`,
        ts,
        petId,
        memberId: null,
        category: "health",
        icon: "health",
        tone: "pink",
        title: `Vaccination · ${v.name}`,
        detail: v.notes ?? null,
        source: { kind: "vaccination", record: v },
      });
    }
    for (const v of feed.vetVisits) {
      const ts = dateToNoon(v.date);
      if (!Number.isFinite(ts) || ts < sinceMs) continue;
      items.push({
        key: `r:${v.id}`,
        ts,
        petId,
        memberId: null,
        category: "health",
        icon: "vet",
        tone: "ice",
        title: `Vet visit · ${v.reason}`,
        detail: v.notes ?? null,
        source: { kind: "vet", record: v },
      });
    }
  }
  return items.sort((a, b) => b.ts - a.ts);
}

export function filterItems(items: HistoryItem[], petId: string | null, category: CategoryFilter): HistoryItem[] {
  return items.filter((i) => (petId === null || i.petId === petId) && (category === "all" || i.category === category));
}

/** Group a newest-first list into day sections. */
export function groupByDay(items: HistoryItem[], now: number = Date.now()): HistorySection[] {
  const sections: HistorySection[] = [];
  for (const item of items) {
    const title = dayLabel(item.ts, now);
    const last = sections[sections.length - 1];
    if (last && last.title === title) last.data.push(item);
    else sections.push({ title, data: [item] });
  }
  return sections;
}
