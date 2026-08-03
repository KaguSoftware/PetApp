// Household-wide roll-up of the per-pet care state machine. `careStatus.ts`
// answers "how is THIS pet doing on THIS item"; this answers "how is the whole
// household doing on THIS lever", which is what the Logs dashboard shows now
// that it no longer has a pet picker. Pure — no React, no store — so the same
// math can back the tiles, the summary card and (later) a widget.

import { careItemStatus, type CareItemStatus } from "@/lib/careStatus";
import type { ActionType, Activity, CareSchedule, Pet } from "@/lib/data";

/**
 * What a care item is asking of you right now, collapsed to the five states a
 * dashboard can color. `open` is the count-target case with work left ("1 of 3
 * meals"); `idle` means nothing is being asked and nothing is known — an
 * unscheduled groom, or a schedule whose first slot hasn't come round yet.
 */
export type CareTone = "overdue" | "due" | "open" | "done" | "idle";

/** Sort/severity order. The loudest tone present wins the tile. */
const TONE_RANK: Record<CareTone, number> = { overdue: 4, due: 3, open: 2, idle: 1, done: 0 };

export interface PetLeverState {
  pet: Pet;
  tone: CareTone;
  status: CareItemStatus;
  /** meds only: how many of this pet's medications are due or overdue. */
  medsDue?: number;
  /** meds only: which medication `status` describes (the most urgent one). */
  medId?: string;
}

export interface LeverSummary {
  type: ActionType;
  /** Pets this lever applies to, in household order. Empty is legal (meds). */
  pets: PetLeverState[];
  tone: CareTone;
  counts: Record<CareTone, number>;
  /** Soonest upcoming slot across the household. */
  next?: { ts: number; petName: string; label?: string };
  /** Most recent log across the household. */
  last?: { ts: number; petName: string };
  /** Summed count targets, for the pets tracking this by count rather than clock. */
  progress?: { count: number; target: number };
  /** At least one applicable pet has real times set for this lever. */
  scheduled: boolean;
}

function toneOf(status: CareItemStatus): CareTone {
  switch (status.state) {
    case "overdue":
      return "overdue";
    case "due":
      return "due";
    case "done":
      return "done";
    case "upcoming":
      return "idle";
    default:
      // Unscheduled: the daily count target is the only thing that can say
      // whether anything is still owed today.
      if (!status.progress) return "idle";
      return status.progress.count >= status.progress.target ? "done" : "open";
  }
}

/** Whether a lever means anything for this pet — litter is a cat thing, walks a dog thing. */
export function leverApplies(pet: Pet, type: ActionType): boolean {
  if (type === "litter") return pet.species === "cat";
  if (type === "walk") return pet.species === "dog";
  if (type === "meds") return pet.meds.length > 0;
  return true;
}

/**
 * The levers this household gets tiles for, in a fixed order — a dashboard
 * that re-orders itself as states change is unreadable. Meds always shows,
 * even with no medications, so there is somewhere to start one.
 */
export function householdLevers(pets: Pet[]): ActionType[] {
  const out: ActionType[] = ["fed", "water"];
  if (pets.some((p) => p.species === "cat")) out.push("litter");
  if (pets.some((p) => p.species === "dog")) out.push("walk");
  out.push("groomed", "meds", "vet");
  return out;
}

/** The pet's most urgent medication, as one status. Undefined when it has none. */
function worstMedStatus(
  pet: Pet,
  schedules: CareSchedule[],
  activities: Activity[],
  now: number
): { status: CareItemStatus; tone: CareTone; medId: string; due: number } | undefined {
  let best: { status: CareItemStatus; tone: CareTone; medId: string } | undefined;
  let due = 0;
  for (const med of pet.meds) {
    const status = careItemStatus(pet, "meds", med.id, schedules, activities, now);
    const tone = toneOf(status);
    if (tone === "due" || tone === "overdue") due++;
    if (!best || TONE_RANK[tone] > TONE_RANK[best.tone]) best = { status, tone, medId: med.id };
  }
  return best ? { ...best, due } : undefined;
}

/** Every applicable pet's state for one lever, rolled into what a tile needs. */
export function summarizeLever(
  type: ActionType,
  pets: Pet[],
  schedules: CareSchedule[],
  activities: Activity[],
  now: number
): LeverSummary {
  const entries: PetLeverState[] = [];
  for (const pet of pets) {
    if (!leverApplies(pet, type)) continue;
    if (type === "meds") {
      const worst = worstMedStatus(pet, schedules, activities, now);
      if (!worst) continue;
      entries.push({ pet, tone: worst.tone, status: worst.status, medsDue: worst.due, medId: worst.medId });
    } else {
      const status = careItemStatus(pet, type, undefined, schedules, activities, now);
      entries.push({ pet, tone: toneOf(status), status });
    }
  }

  const counts: Record<CareTone, number> = { overdue: 0, due: 0, open: 0, done: 0, idle: 0 };
  let next: LeverSummary["next"];
  let last: LeverSummary["last"];
  let count = 0;
  let target = 0;
  let scheduled = false;

  for (const e of entries) {
    counts[e.tone]++;
    if (e.status.next) {
      scheduled = true;
      if (!next || e.status.next.ts < next.ts) {
        next = { ts: e.status.next.ts, petName: e.pet.name, label: e.status.next.label };
      }
    }
    if (e.status.last && (!last || e.status.last.ts > last.ts)) {
      last = { ts: e.status.last.ts, petName: e.pet.name };
    }
    if (e.status.progress) {
      count += e.status.progress.count;
      target += e.status.progress.target;
    }
  }

  const tone = entries.reduce<CareTone>((worst, e) => (TONE_RANK[e.tone] > TONE_RANK[worst] ? e.tone : worst), "done");

  return {
    type,
    pets: entries,
    tone: entries.length === 0 ? "idle" : tone,
    counts,
    next,
    last,
    progress: target > 0 ? { count, target } : undefined,
    scheduled,
  };
}

/* ---------------------------------------------------------------- formatting */

/** "6:00 PM" / "tomorrow 8:00 AM" / "Sat 9:00 AM" for a future slot. */
export function clockLabel(ts: number, now: number): string {
  const time = new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const d = new Date(ts).toDateString();
  if (d === new Date(now).toDateString()) return time;
  if (d === new Date(now + 86_400_000).toDateString()) return `tomorrow ${time}`;
  return `${new Date(ts).toLocaleDateString([], { weekday: "short" })} ${time}`;
}

/** How long ago, in the coarsest unit that still means something ("3 weeks ago"). */
export function sinceLabel(ts: number, now: number): string {
  const mins = Math.round((now - ts) / 60_000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 9) return `${weeks} weeks ago`;
  const months = Math.round(days / 30.4);
  return months < 12 ? `${months} months ago` : "over a year ago";
}

/**
 * The one line under a tile's label. Ordered by what should pull someone in:
 * what's late, then what's owed, then what's coming, then when it last
 * happened. Names a pet only when naming one narrows anything down.
 */
export function leverStatusLine(s: LeverSummary, now: number): string {
  const solo = s.pets.length === 1;
  const nameFor = (tone: CareTone) => s.pets.find((p) => p.tone === tone)?.pet.name ?? "";

  if (s.counts.overdue > 0) {
    if (s.counts.overdue > 1) return `${s.counts.overdue} pets overdue`;
    return solo ? "Overdue" : `${nameFor("overdue")} is overdue`;
  }
  if (s.counts.due > 0) {
    if (s.counts.due > 1) return `${s.counts.due} pets due now`;
    return solo ? "Due now" : `${nameFor("due")} is due now`;
  }
  if (s.counts.open > 0) {
    if (s.progress) return `${s.progress.count} of ${s.progress.target} today`;
    return solo ? "Not done today" : `${s.counts.open} still to do`;
  }
  if (s.next) return solo ? `Next ${clockLabel(s.next.ts, now)}` : `Next ${clockLabel(s.next.ts, now)} · ${s.next.petName}`;
  if (s.tone === "done") {
    if (s.progress) return `${s.progress.count} of ${s.progress.target} today`;
    return s.pets.length > 1 ? "All done" : "Done today";
  }
  if (s.pets.length === 0) return "None tracked yet";
  if (s.last) return `Last ${sinceLabel(s.last.ts, now)}`;
  return "Never logged";
}

/** The per-pet caption in the pet chooser — same information, one pet's worth. */
export function petStateLine(e: PetLeverState, now: number): string {
  switch (e.tone) {
    case "overdue":
      return "Overdue";
    case "due":
      return "Due now";
    case "open":
      return e.status.progress ? `${e.status.progress.count} of ${e.status.progress.target}` : "Not done";
    case "done":
      return e.status.last ? `Done ${new Date(e.status.last.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Done";
    default:
      if (e.status.next) return clockLabel(e.status.next.ts, now);
      return e.status.last ? sinceLabel(e.status.last.ts, now) : "Not logged";
  }
}

/**
 * Per-pet progress across every lever that is actually asking for something
 * today. Vet is excluded on purpose: a checkup is a once-a-year event, and
 * counting it would put "all caught up" permanently out of reach.
 */
export function petDayProgress(pet: Pet, summaries: LeverSummary[]): { required: number; done: number; overdue: number } {
  let required = 0;
  let done = 0;
  let overdue = 0;
  for (const s of summaries) {
    if (s.type === "vet") continue;
    const e = s.pets.find((x) => x.pet.id === pet.id);
    if (!e || e.tone === "idle") continue;
    required++;
    if (e.tone === "done") done++;
    if (e.tone === "overdue") overdue++;
  }
  return { required, done, overdue };
}
