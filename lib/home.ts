// The Home document model — pure, no React, no store.
//
// Home asks a different question from the three pages beside it. Care says what
// the routine IS. Logs is where you DO it. Inbox is what is being ASKED. Home
// says how the household is RIGHT NOW, and what the one next thing is.
//
// So everything here is a *reading* of state, never a second definition of one.
// Every figure below comes out of `careStatus` / `careDashboard` — the same
// machine the other three pages read — which is why a lever can't say "late"
// here and "due" one tab over. The only things this file owns are the sentences
// Home puts around those readings, and the day-so-far rail, which is the one
// figure no other page draws.

import {
  clockLabel,
  householdLevers,
  leverApplies,
  sinceLabel,
  summarizeLever,
  type CareTone,
  type LeverSummary,
  type PetLeverState,
} from "@/lib/careDashboard";
import { scheduleOccurrences, type CareItemStatus } from "@/lib/careStatus";
import { formatAge, formatWeight, type ActionType, type Activity, type CareSchedule, type Pet, type Reminder } from "@/lib/data";

const DAY_MS = 86_400_000;

/** Only the levers that recur inside a day belong on a clock — the same set the
 *  Care page's rail uses, for the same reason (a fortnightly bath has no place
 *  on an axis that resets every morning). */
const RAIL_ACTIONS: ActionType[] = ["fed", "water", "litter", "walk", "meds"];

/** Nouns, not the past participles `ACTIONS` carries. "Fed / Water / Walk" in a
 *  column reads as three different parts of speech; "Meals / Water / Walks"
 *  reads as a document. */
const LINE_LABEL: Record<ActionType, string> = {
  fed: "Meals",
  water: "Water",
  litter: "Litter box",
  walk: "Walks",
  groomed: "Grooming",
  meds: "Meds",
  vet: "Checkup",
};

/** What the animal is short of, said as a thing rather than as a state. */
const NEEDS: Record<ActionType, string> = {
  fed: "a meal",
  water: "fresh water",
  litter: "a clean litter box",
  walk: "a walk",
  groomed: "a groom",
  meds: "a dose",
  vet: "a checkup",
};

/** What the lede's one button says. Actions that need no further input are
 *  logged from the button itself; the two that do are a door instead. */
const LOG_LABEL: Record<ActionType, string> = {
  fed: "Log a meal",
  water: "Log fresh water",
  litter: "Log the litter box",
  walk: "Log the walk",
  groomed: "Log a groom",
  meds: "Log a dose",
  vet: "Open the logs",
};

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function clock(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** "Milo", "Milo and Luna", "Milo, Luna and Nala" — the Care page's own joiner. */
function join(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/* ------------------------------------------------------------------ the lede */

export type LedeKind = "overdue" | "due" | "open" | "clear";

/** What the lede's button does. `feed` and `log` act in place; `route` leaves. */
export type LedeAction =
  | { kind: "feed"; label: string; pet: Pet }
  | { kind: "log"; label: string; pet: Pet; type: ActionType }
  | { kind: "route"; label: string; href: "/logs" | "/inbox" };

export interface Lede {
  kind: LedeKind;
  /** The chapter word above the headline — the only hot type on the page. */
  kicker: string;
  headline: string;
  /** One quiet line of evidence under it. */
  detail?: string;
  /** The animal the headline is about: Home's lead portrait. */
  pet?: Pet;
  action?: LedeAction;
}

/* -------------------------------------------------------------- the day rail */

export type MarkState = "done" | "missed" | "ahead";

export interface HomeMark {
  key: string;
  /** Minutes past midnight — the rail's axis. */
  minutes: number;
  action: ActionType;
  state: MarkState;
  label: string;
}

export interface HomeDay {
  pet: Pet;
  marks: HomeMark[];
}

/* ------------------------------------------------------------ a pet's column */

/** The quiet end of a pet's section: things that matter but not hourly. */
export type NoteTint = "quiet" | "warn" | "late";

export interface PetNote {
  id: string;
  label: string;
  value: string;
  tint: NoteTint;
}

export interface PetLine {
  id: string;
  label: string;
  value: string;
  tone: CareTone;
  type: ActionType;
}

export interface PetSection {
  pet: Pet;
  /** Breed, age, weight — the last two are editable in place. */
  breed: string;
  age: string;
  weight: string;
  lines: PetLine[];
  notes: PetNote[];
  /** The loudest state anything of this pet's is in: the colour of its rule. */
  tone: CareTone;
}

/* -------------------------------------------------------------- what's ahead */

export interface AheadItem {
  id: string;
  label: string;
  who?: string;
  when: string;
  tint: NoteTint;
}

export interface HomeDocument {
  standfirst: string;
  lede: Lede;
  days: HomeDay[];
  sections: PetSection[];
  ahead: AheadItem[];
  openReminders: number;
}

/* ---------------------------------------------------------------------- rail */

/** Same matching rule as `careStatus`'s private `matchesItem`: a meds log with
 *  no medId (legacy rows, retro logs) counts toward a single-med pet's only
 *  medication. Kept in step by hand because that helper isn't exported. */
function logMatches(a: Activity, pet: Pet, type: ActionType, medId: string | undefined): boolean {
  if (a.petId !== pet.id || a.type !== type) return false;
  if (type !== "meds" || medId == null) return true;
  return a.medId === medId || (a.medId == null && pet.meds.length === 1 && pet.meds[0].id === medId);
}

/**
 * Which of today's slots actually happened.
 *
 * A slot owns the window that runs from its own grace band up to the next
 * slot's — the same window `careItemStatus` uses to decide "done", so a mark
 * here and a row below it can't disagree. Anything still unlogged once its
 * grace has run out is a miss; anything still in front of the clock is ahead.
 */
function markSlots(occurrences: number[], logs: number[], graceMs: number, now: number): MarkState[] {
  return occurrences.map((ts, i) => {
    const from = ts - graceMs;
    const to = i + 1 < occurrences.length ? occurrences[i + 1] - graceMs : Infinity;
    if (logs.some((t) => t >= from && t < to)) return "done";
    return ts + graceMs < now ? "missed" : "ahead";
  });
}

/**
 * One pet's day so far.
 *
 * This is the figure Care's rail can't draw. There, a mark is a time the family
 * has SET — the plan. Here it is a time that has HAPPENED, been missed, or is
 * still coming, which is the only question a home screen is ever really asked.
 * Care's rail is empty for a household that has never opened the schedule
 * editor; this one fills up the moment anybody logs anything.
 */
function petDay(pet: Pet, schedules: CareSchedule[], activities: Activity[], now: number): HomeDay {
  const dayStart = startOfDay(now);
  const dayEnd = dayStart + DAY_MS;
  const marks: HomeMark[] = [];
  /** Half-hour buckets, so two medicines at "around eight" are one moment. */
  const taken = new Set<string>();
  const bucket = (type: ActionType, minutes: number) => `${type}:${Math.round(minutes / 30)}`;
  /** Windows a slot mark has already spoken for. A meal logged at 8:20 against
   *  an 8:00 slot lands in a different half-hour bucket, so the bucket check
   *  alone would draw the same meal twice — once filled at its slot, once again
   *  twenty minutes later. */
  const spoken: { type: ActionType; from: number; to: number }[] = [];

  for (const s of schedules) {
    if (s.petId !== pet.id || !RAIL_ACTIONS.includes(s.type)) continue;
    // A cadence measured in days isn't a time of day.
    if (s.intervalDays != null && s.intervalDays > 1) continue;
    const occurrences = scheduleOccurrences(s, dayStart, DAY_MS).map((o) => o.ts);
    if (occurrences.length === 0) continue;
    const graceMs = s.graceMinutes * 60_000;
    const logs = activities.filter((a) => logMatches(a, pet, s.type, s.medId) && a.ts >= dayStart && a.ts < dayEnd).map((a) => a.ts);
    const states = markSlots(occurrences, logs, graceMs, now);
    occurrences.forEach((ts, i) => {
      if (states[i] === "done") {
        spoken.push({ type: s.type, from: ts - graceMs, to: i + 1 < occurrences.length ? occurrences[i + 1] - graceMs : Infinity });
      }
      const minutes = Math.round((ts - dayStart) / 60_000);
      const key = bucket(s.type, minutes);
      if (taken.has(key)) return;
      taken.add(key);
      marks.push({ key: `${s.id}:${ts}`, minutes, action: s.type, state: states[i], label: LINE_LABEL[s.type] });
    });
  }

  // Everything logged today that no slot accounted for. Without this a family
  // with no schedules — most of them, at first — reads an empty rail as "you
  // have done nothing", which is both discouraging and untrue.
  for (const a of activities) {
    if (a.petId !== pet.id || !RAIL_ACTIONS.includes(a.type)) continue;
    if (a.ts < dayStart || a.ts >= dayEnd) continue;
    if (spoken.some((w) => w.type === a.type && a.ts >= w.from && a.ts < w.to)) continue;
    const minutes = Math.round((a.ts - dayStart) / 60_000);
    const key = bucket(a.type, minutes);
    if (taken.has(key)) continue;
    taken.add(key);
    marks.push({ key: a.id, minutes, action: a.type, state: "done", label: LINE_LABEL[a.type] });
  }

  marks.sort((a, b) => a.minutes - b.minutes);
  return { pet, marks };
}

/* ------------------------------------------------------------------ readings */

/** The one value on a care line. Progress wins over a clock: "2 of 3" says more
 *  than "due now" when the day has a target left in it. */
function lineValue(status: CareItemStatus, tone: CareTone, now: number): string {
  const p = status.progress;
  if (tone === "overdue") return "Late";
  if (tone === "due") return "Due now";
  if (p && p.target > 1) return `${p.count} of ${p.target}`;
  if (tone === "done") return status.last ? `Done ${clock(status.last.ts)}` : "Done";
  if (tone === "open") return "Not yet";
  if (status.next) return clockLabel(status.next.ts, now);
  return status.last ? sinceLabel(status.last.ts, now) : "Not logged";
}

/** The levers that earn a full row of this pet's section. Everything slower
 *  runs in as prose underneath. */
function dailyLevers(pet: Pet): ActionType[] {
  const out: ActionType[] = ["fed", "water"];
  if (pet.species === "cat") out.push("litter");
  else out.push("walk");
  if (pet.meds.length > 0) out.push("meds");
  return out;
}

/**
 * Every reading below comes out of the lever summaries computed once at the top
 * of `homeDocument`, never from a fresh `careItemStatus` call. Two evaluations
 * of the same lever inside one render is both wasted work over the whole
 * activity list and a way for a row and the sentence above it to disagree by a
 * minute.
 */
function lineFor(pet: Pet, type: ActionType, byLever: Map<ActionType, LeverSummary>, now: number): PetLine | undefined {
  const entry = byLever.get(type)?.pets.find((p) => p.pet.id === pet.id);
  if (!entry) return undefined;
  const due = entry.medsDue ?? 0;
  return {
    id: `${pet.id}:${type}`,
    label: LINE_LABEL[type],
    value: type === "meds" && due > 0 ? `${due} due` : lineValue(entry.status, entry.tone, now),
    tone: entry.tone,
    type,
  };
}

/**
 * Short name for a supply. The stored names ("Dry food", "Poop bags") are too
 * long to run in beside four other clauses, and the icon is what the whole app
 * already uses to tell food from sanitation.
 */
function supplyLabel(icon: string, species: Pet["species"], fallback: string): string {
  if (icon === "bowl") return "Food";
  if (icon === "broom") return species === "cat" ? "Litter" : "Bags";
  if (icon === "star") return "Treats";
  return fallback;
}

function supplyTint(level: number): NoteTint {
  if (level < 20) return "late";
  if (level < 50) return "warn";
  return "quiet";
}

/** The slow half of a pet's section: grooming, the last checkup, the cupboard. */
function notesFor(pet: Pet, groom: PetLeverState | undefined, now: number): PetNote[] {
  const notes: PetNote[] = [];

  notes.push({
    id: `${pet.id}:groomed`,
    label: LINE_LABEL.groomed,
    // Term then value, run in as "Grooming 3 weeks ago" — so the empty case has
    // to be a phrase that follows the term too, not the word "never".
    value: groom?.status.last ? sinceLabel(groom.status.last.ts, now) : "none yet",
    tint: groom?.tone === "overdue" ? "late" : groom?.tone === "due" ? "warn" : "quiet",
  });

  const lastVisit = pet.vetVisits.reduce<number>((latest, v) => Math.max(latest, v.ts), 0);
  notes.push({
    id: `${pet.id}:vet`,
    label: LINE_LABEL.vet,
    value: lastVisit > 0 ? sinceLabel(lastVisit, now) : "none on record",
    tint: "quiet",
  });

  for (const s of pet.supplies) {
    notes.push({
      id: `${pet.id}:supply:${s.id}`,
      label: supplyLabel(s.icon, pet.species, s.name),
      value: `${s.level}%`,
      tint: supplyTint(s.level),
    });
  }

  return notes;
}

/* ---------------------------------------------------------------- the sentence */

/** How late, in the coarsest unit that still means something. */
export function whenLabel(ts: number, now: number): string {
  if (ts <= now) return "late";
  const todayEnd = startOfDay(now) + DAY_MS;
  if (ts < todayEnd) return clock(ts);
  if (ts < todayEnd + DAY_MS) return "tomorrow";
  if (ts < startOfDay(now) + 7 * DAY_MS) return new Date(ts).toLocaleDateString([], { weekday: "long" });
  return new Date(ts).toLocaleDateString([], { day: "numeric", month: "short" });
}

/**
 * The lede: the one thing, in one sentence, with one button.
 *
 * Levers are walked in the household's fixed order, so food outranks water
 * outranks the yard — and the first animal in trouble wins. Nothing is summed
 * or averaged here: a page that opens with "3 items need attention" has told
 * you a number instead of a thing to do.
 */
function pickLede(pets: Pet[], summaries: LeverSummary[], now: number): Lede {
  const find = (tone: CareTone) => {
    for (const summary of summaries) {
      const entry = summary.pets.find((p) => p.tone === tone);
      if (entry) return { summary, entry };
    }
    return undefined;
  };

  const hit = find("overdue") ?? find("due") ?? find("open");

  if (hit) {
    const { summary, entry } = hit;
    const type = summary.type;
    const pet = entry.pet;
    const kind: LedeKind = entry.tone === "overdue" ? "overdue" : entry.tone === "due" ? "due" : "open";
    const progress = entry.status.progress;
    return {
      kind,
      kicker: kind === "overdue" ? "Late" : kind === "due" ? "Right now" : "Still to do",
      headline: `${pet.name} needs ${NEEDS[type]}`,
      detail:
        progress && progress.target > 1
          ? `${progress.count} of ${progress.target} done today`
          : entry.status.last
            ? // "Last done yesterday", not "Last yesterday" — `sinceLabel`
              // returns a bare phrase and half of them need the verb.
              `Last done ${sinceLabel(entry.status.last.ts, now)}`
            : "Nothing logged yet",
      pet,
      action:
        type === "fed"
          ? { kind: "feed", label: LOG_LABEL.fed, pet }
          : type === "meds" || type === "vet"
            ? { kind: "route", label: LOG_LABEL[type], href: "/logs" }
            : { kind: "log", label: LOG_LABEL[type], pet, type },
    };
  }

  // Nothing is owed. The portrait becomes whoever is up next, so the animal on
  // screen is always the answer to "who needs me", even when the answer is
  // "nobody, for another four hours".
  let next: { ts: number; pet: Pet; label: string } | undefined;
  for (const summary of summaries) {
    for (const entry of summary.pets) {
      if (!entry.status.next) continue;
      if (!next || entry.status.next.ts < next.ts) {
        next = { ts: entry.status.next.ts, pet: entry.pet, label: NEEDS[summary.type] };
      }
    }
  }

  return {
    kind: "clear",
    kicker: "All caught up",
    headline: pets.length > 1 ? "Nobody needs you" : pets.length === 1 ? `${pets[0].name} is sorted` : "Nothing to do",
    detail: next ? `Next: ${next.pet.name} needs ${next.label} at ${clock(next.ts)}` : "Nothing else is scheduled today",
    pet: next?.pet ?? pets[0],
  };
}

/** "Milo and Luna. 2 late and 3 still to do today." */
function standfirstFor(pets: Pet[], summaries: LeverSummary[]): string {
  let late = 0;
  let todo = 0;
  for (const summary of summaries) {
    // A yearly checkup would put "everything done" permanently out of reach —
    // the same exclusion `petDayProgress` makes, for the same reason.
    if (summary.type === "vet") continue;
    late += summary.counts.overdue;
    todo += summary.counts.due + summary.counts.open;
  }
  const names = join(pets.map((p) => p.name));
  if (late === 0 && todo === 0) return `${names}. Everything today is done.`;
  const parts: string[] = [];
  if (late > 0) parts.push(`${late} late`);
  if (todo > 0) parts.push(`${todo} still to do`);
  return `${names}. ${parts.join(" and ")} today.`;
}

/* -------------------------------------------------------------------- assembly */

export function homeDocument(
  pets: Pet[],
  schedules: CareSchedule[],
  activities: Activity[],
  reminders: Reminder[],
  units: "kg" | "lb",
  now: number
): HomeDocument {
  // Computed once, read everywhere: the standfirst, the lede, every care line
  // and every note below are all views onto this one evaluation.
  const summaries = householdLevers(pets).map((type) => summarizeLever(type, pets, schedules, activities, now));
  const byLever = new Map(summaries.map((s) => [s.type, s]));

  const sections: PetSection[] = pets.map((pet) => {
    const lines = dailyLevers(pet)
      .filter((type) => leverApplies(pet, type))
      .map((type) => lineFor(pet, type, byLever, now))
      .filter((line): line is PetLine => line != null);
    // The rule beside the name takes the loudest state anything of this pet's
    // is in — the state recolours what is already there instead of adding a
    // badge next to it.
    const tone: CareTone = lines.some((l) => l.tone === "overdue")
      ? "overdue"
      : lines.some((l) => l.tone === "due")
        ? "due"
        : lines.some((l) => l.tone === "open")
          ? "open"
          : "done";
    return {
      pet,
      breed: pet.breed,
      age: formatAge(pet.ageYears),
      weight: formatWeight(pet.weightKg, units),
      lines,
      notes: notesFor(pet, byLever.get("groomed")?.pets.find((p) => p.pet.id === pet.id), now),
      tone,
    };
  });

  const open = reminders.filter((r) => !r.done);
  const ahead: AheadItem[] = open
    // Raised alerts first — they are the app telling you something rather than
    // the family reminding itself — then simply by time.
    .sort((a, b) => Number(!!b.alert) - Number(!!a.alert) || a.due - b.due)
    .slice(0, 4)
    .map((r) => ({
      id: r.id,
      label: r.title,
      who: pets.find((p) => p.id === r.petId)?.name,
      when: whenLabel(r.due, now),
      tint: r.alert || r.due <= now ? "late" : r.due < startOfDay(now) + DAY_MS ? "warn" : "quiet",
    }));

  return {
    standfirst: standfirstFor(pets, summaries),
    lede: pickLede(pets, summaries, now),
    days: pets.map((pet) => petDay(pet, schedules, activities, now)),
    sections,
    ahead,
    openReminders: open.length,
  };
}
