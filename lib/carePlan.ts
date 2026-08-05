// The Care page's document model.
//
// `careStatus.ts` answers "is this pet late for something"; this answers "what
// is this household's routine", which is a different question with a different
// shape. The answer is a document: chapters by rhythm (every day / every week /
// every few weeks / once a year), each chapter a set of lines, each line one
// care item carrying one value per pet.
//
// Pure — no React, no store — so the same document can back the page, a test,
// or a printable plan later.

import type { IconName } from "@/components/Icons";
import { findSchedule } from "@/lib/careStatus";
import { CARE_PLANS, DEFAULT_TARGETS, weightFeedingEntry, type ActionType, type CareSchedule, type Pet } from "@/lib/data";

/** The four chapters. Anything slower than "a few weeks" is a once-a-year thing. */
export type Rhythm = "day" | "week" | "weeks" | "year";

export const RHYTHMS: Rhythm[] = ["day", "week", "weeks", "year"];

export const RHYTHM_LABEL: Record<Rhythm, string> = {
  day: "Every day",
  week: "Every week",
  weeks: "Every few weeks",
  year: "Once a year",
};

/** Which key on `customPlan` a daily count writes to. */
export type CountKey = "fedPerDay" | "fedGrams" | "waterPerDay" | "litterPerDay" | "walkPerDay";

/** How a value is changed. `none` is a value the family doesn't author (a med's
 *  times live in its schedule, which the Logs tab owns). */
export type PlanEdit =
  | { kind: "count"; key: CountKey; max: number }
  | { kind: "grams" }
  | { kind: "cadence"; id: string }
  | { kind: "med"; medId: string };

export interface PlanEntry {
  pet: Pet;
  /** What the chip prints. Short by construction — the chapter carries the unit. */
  value: string;
  /** Anything the raw cadence said beyond its frequency ("15–20 min"). */
  extra?: string;
  /** The plan's own sentence about this item for this pet. */
  detail?: string;
  /** Present only when the family has overridden the plan: what the plan said. */
  suggested?: string;
  /** The unformatted value the editor works on: a count/grams, or the raw cadence. */
  amount?: number;
  rawCadence?: string;
  edit: PlanEdit;
}

export interface PlanLine {
  /** Unique within its chapter. */
  id: string;
  label: string;
  icon: IconName;
  /** The how-to guide that explains this item, when one exists. */
  guideId?: string;
  /** The schedule this item's times live in, when it can have times at all.
   *  Nail trimming can't be put on a clock; meals, walks and doses can. */
  action?: ActionType;
  entries: PlanEntry[];
}

export interface PlanChapter {
  rhythm: Rhythm;
  lines: PlanLine[];
}

/* ------------------------------------------------------------------ cadence */

const EN_DASH = "–";
const UNIT_RHYTHM: Record<string, Rhythm> = { daily: "day", weekly: "week", monthly: "weeks", yearly: "year" };
const UNIT_DAYS: Record<string, number> = { day: 1, week: 7, month: 30.4, year: 365 };
const UNIT_SHORT: Record<string, string> = { day: "days", week: "wks", month: "mo", year: "yr" };

function rhythmForDays(days: number): Rhythm {
  if (days <= 2) return "day";
  if (days <= 10) return "week";
  if (days <= 150) return "weeks";
  return "year";
}

function span(a: string, b?: string): string {
  return b ? `${a}${EN_DASH}${b}` : a;
}

/**
 * Turn a vet-written cadence ("3-7× weekly", "Every 2-4 weeks", "1-2× daily,
 * 15-20 min") into the chapter it belongs in plus the short value a chip can
 * print. The chapter already says the unit, so "Weekly" prints as "1×" — the
 * word would only be repeating its own heading.
 */
export function readCadence(raw: string): { rhythm: Rhythm; value: string; extra?: string } {
  let s = raw.trim();
  let extra: string | undefined;

  // "Daily; pro-groom every 4-6 weeks" — the clause after the semicolon is a
  // second, slower rhythm. It's a footnote, not a line of its own.
  const semi = /;\s*(.+)$/.exec(s);
  if (semi) {
    extra = semi[1].trim();
    s = s.slice(0, semi.index).trim();
  }

  const duration = /,\s*([\d\s\-–+]+min)\s*$/i.exec(s);
  if (duration) {
    extra = extra ?? duration[1].trim().replace(/-/g, EN_DASH);
    s = s.slice(0, duration.index).trim();
  }

  if (/as prescribed/i.test(s)) {
    extra = extra ?? "as prescribed";
    s = s.replace(/\s*(?:or\s+)?as prescribed/i, "").trim();
  }

  if (/constant/i.test(s)) return { rhythm: "day", value: "always", extra };
  if (/as needed/i.test(s)) return { rhythm: "day", value: "as needed", extra };

  // Medication frequencies are written in words ("Twice daily") where the care
  // plans use figures ("2× daily"). Normalise so one parser reads both.
  s = s
    .replace(/^once\s+(?=daily|weekly|monthly|yearly)/i, "1× ")
    .replace(/^twice\s+(?=daily|weekly|monthly|yearly)/i, "2× ")
    .replace(/^(two|three|four|five|six)\s+times\s+(?=daily|weekly|monthly|yearly)/i, (_m, word: string) => {
      const n = { two: 2, three: 3, four: 4, five: 5, six: 6 }[word.toLowerCase() as "two"];
      return `${n}× `;
    })
    .replace(/^every other day$/i, "every 2 days");

  // "3-7× weekly" — the unit names the chapter even when the count is high;
  // dental care happens most days but people plan it by the week.
  const times = /^(\d+)(?:\s*-\s*(\d+))?\s*×\s*(daily|weekly|monthly|yearly)/i.exec(s);
  if (times) {
    const unit = times[3].toLowerCase();
    const count = `${span(times[1], times[2])}×`;
    // The "every few weeks" chapter isn't literally a month, so a monthly item
    // has to say so or it reads the same as a three-weekly one.
    return { rhythm: UNIT_RHYTHM[unit], value: unit === "monthly" ? `${count} a month` : count, extra };
  }

  // "Every 2-4 weeks" — here the interval names the chapter, so a six-weekly
  // bath files under "every few weeks" rather than under "every week".
  const every = /every\s+(\d+)(?:\s*-\s*(\d+))?\s+(day|week|month|year)s?/i.exec(s);
  if (every) {
    const unit = every[3].toLowerCase();
    const n = every[2] ? (Number(every[1]) + Number(every[2])) / 2 : Number(every[1]);
    const gap = `${span(every[1], every[2])} ${UNIT_SHORT[unit]}`;
    // A day-interval lands in the "every day" chapter, where a bare "2 days"
    // would contradict the heading it sits under.
    return { rhythm: rhythmForDays(n * UNIT_DAYS[unit]), value: unit === "day" ? `every ${gap}` : gap, extra };
  }

  const bare = /^(daily|weekly|monthly|yearly)\b/i.exec(s);
  if (bare) {
    const unit = bare[1].toLowerCase();
    return { rhythm: UNIT_RHYTHM[unit], value: unit === "monthly" ? "monthly" : "1×", extra };
  }

  if (/dai?ly|\bday\b/i.test(s)) return { rhythm: "day", value: "1×", extra };
  if (/week/i.test(s)) return { rhythm: "week", value: "1×", extra };
  if (/month/i.test(s)) return { rhythm: "weeks", value: "monthly", extra };
  if (/year|annual/i.test(s)) return { rhythm: "year", value: "1×", extra };
  return { rhythm: "weeks", value: s.toLowerCase(), extra };
}

/* -------------------------------------------------------------------- lines */

/** The counts a day is made of. Fixed order — this list is read by position. */
const DAILY_LINES: {
  id: string;
  label: string;
  icon: IconName;
  guideId?: string;
  action: ActionType;
  key: CountKey;
  max: number;
  grams?: true;
  species?: "cat" | "dog";
}[] = [
  { id: "meals", label: "Meals", icon: "bowl", guideId: "feeding", action: "fed", key: "fedPerDay", max: 8 },
  { id: "food", label: "Food", icon: "box", guideId: "feeding", action: "fed", key: "fedGrams", max: 1200, grams: true },
  { id: "water", label: "Water", icon: "drop", action: "water", key: "waterPerDay", max: 8 },
  { id: "litter", label: "Litter", icon: "broom", action: "litter", key: "litterPerDay", max: 6, species: "cat" },
  { id: "walks", label: "Walks", icon: "paw", action: "walk", key: "walkPerDay", max: 6, species: "dog" },
];

/**
 * Breed plans name the same activity differently — "Brushing / grooming",
 * "Brushing / wrinkle cleaning", "Exercise & play", "Exercise & training". A
 * household with two breeds would otherwise get two lines for one job, so every
 * title is normalised to a canonical line first.
 *
 * The ids are the ones `customPlan.cadences` has always been keyed by, so a
 * family's existing edits keep applying.
 */
const CANON: { test: RegExp; id: string; label: string; icon: IconName; guideId?: string; action?: ActionType }[] = [
  { test: /nail/i, id: "nails", label: "Nail trimming", icon: "clipper", guideId: "nail-trimming" },
  { test: /dental|teeth/i, id: "dental", label: "Dental care", icon: "sparkles", guideId: "dental-care" },
  { test: /ear/i, id: "ears", label: "Ear cleaning", icon: "drop" },
  { test: /bath/i, id: "bathing", label: "Bathing", icon: "drop" },
  { test: /brush|groom|coat/i, id: "grooming", label: "Brushing", icon: "scissors", guideId: "grooming", action: "groomed" },
  { test: /weight/i, id: "weight", label: "Weight check", icon: "scale", guideId: "weight-check" },
  { test: /parasite|flea|heartworm|tick/i, id: "parasite", label: "Parasite prevention", icon: "shield" },
  { test: /vet|checkup/i, id: "vet", label: "Vet checkup", icon: "stethoscope", guideId: "vet-visits", action: "vet" },
  { test: /potty/i, id: "potty", label: "Potty breaks", icon: "door" },
  { test: /exercise|play|stimulation|training/i, id: "play", label: "Exercise & play", icon: "yarn" },
];

/** Order inside a chapter. Fixed, so a line never moves under someone. */
const CANON_ORDER = ["play", "potty", "grooming", "ears", "bathing", "dental", "nails", "weight", "parasite", "vet"];

/** The routine for a breed with no vet-built plan. Same canonical ids. */
const CUSTOM_ROUTINE: Record<"cat" | "dog", { id: string; cadence: string; detail: string }[]> = {
  cat: [
    { id: "play", cadence: "1-2× daily, 15-20 min", detail: "Daily play to keep an indoor cat moving and mentally busy." },
    { id: "grooming", cadence: "Weekly", detail: "Regular brushing to manage shedding and prevent matting." },
    { id: "dental", cadence: "3-7× weekly", detail: "Teeth cleaning, water additives, or dental treats." },
    { id: "nails", cadence: "Every 2-4 weeks", detail: "Clip nails to prevent overgrowth and snagging." },
    { id: "weight", cadence: "1-2× monthly", detail: "Routine monitoring to catch weight gain early." },
    { id: "parasite", cadence: "Monthly", detail: "Routine flea, tick, and worm prevention." },
    { id: "vet", cadence: "Yearly", detail: "Wellness exams and vaccinations." },
  ],
  dog: [
    { id: "potty", cadence: "3-5× daily", detail: "Regular daily opportunities to go outside." },
    { id: "grooming", cadence: "1-2× weekly", detail: "Regular brushing to manage shedding and prevent matting." },
    { id: "ears", cadence: "Weekly", detail: "Clean ears to prevent moisture buildup and infection." },
    { id: "dental", cadence: "3-7× weekly", detail: "Teeth brushing or dental chews to prevent tartar." },
    { id: "bathing", cadence: "Every 6-8 weeks", detail: "Occasional baths, or after muddy play." },
    { id: "nails", cadence: "Every 3-4 weeks", detail: "Clip nails to maintain proper paw structure." },
    { id: "weight", cadence: "1-2× monthly", detail: "Routine monitoring to catch weight gain early." },
    { id: "parasite", cadence: "Monthly", detail: "Routine heartworm, flea, and tick prevention." },
    { id: "vet", cadence: "Yearly", detail: "Wellness exams and vaccinations." },
  ],
};

/** The four daily counts are lines of their own; medication has its own lines. */
function isStructural(action: ActionType | undefined, title: string): boolean {
  if (action && (["fed", "water", "litter", "walk"] as ActionType[]).includes(action)) return true;
  return /medicat/i.test(title);
}

function canonFor(title: string): { id: string; label: string; icon: IconName; guideId?: string; action?: ActionType } {
  const hit = CANON.find((c) => c.test.test(title));
  if (hit) return hit;
  return { id: title.toLowerCase().replace(/[^a-z]+/g, "-"), label: title, icon: "heart-text" };
}

/**
 * What the plan recommends, before any family override.
 *
 * `vetPlans` is the PetPal+ switch. Off, the whole document is still built —
 * from the species defaults the free app already tracks against — so nobody
 * gets a wall where their routine should be. On, the breed's vet-built numbers
 * and cadences replace them line for line.
 */
function suggestedCount(pet: Pet, action: ActionType, vetPlans: boolean): number | undefined {
  const fromPlan = vetPlans ? CARE_PLANS[pet.breed]?.items.find((i) => i.action === action)?.perDay : undefined;
  return fromPlan ?? DEFAULT_TARGETS[pet.species][action];
}

function suggestedGrams(pet: Pet, vetPlans: boolean): number | undefined {
  const meals = suggestedCount(pet, "fed", vetPlans);
  if (!vetPlans) return meals != null ? meals * pet.cupGrams : undefined;
  // The age/gender weight guide is the sharpest number PetPal has, so it leads.
  const guide = weightFeedingEntry(pet)?.kibbleGramsRange;
  if (guide) return Math.round((guide[0] + guide[1]) / 2);
  const fromPlan = CARE_PLANS[pet.breed]?.items.find((i) => i.action === "fed")?.perDayGrams;
  if (fromPlan != null) return fromPlan;
  return meals != null ? meals * pet.cupGrams : undefined;
}

/** "08:00" → "8 AM", "18:30" → "6:30 PM". Minutes only when they carry meaning. */
function compactTime(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;
  const d = new Date();
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d.toLocaleTimeString([], Number(m[2]) === 0 ? { hour: "numeric" } : { hour: "numeric", minute: "2-digit" });
}

/* ---------------------------------------------------------------- assembly */

type Draft = Map<string, PlanLine>;

function lineIn(drafts: Record<Rhythm, Draft>, rhythm: Rhythm, seed: Omit<PlanLine, "entries">): PlanLine {
  const map = drafts[rhythm];
  const existing = map.get(seed.id);
  if (existing) return existing;
  const line: PlanLine = { ...seed, entries: [] };
  map.set(seed.id, line);
  return line;
}

/**
 * The household's routine as chapters. Every pet contributes an entry to the
 * lines that apply to it, and a line lands in the chapter its cadence actually
 * belongs to — including when a family has overridden that cadence, which is
 * why the same item can appear in two chapters for two pets. That isn't a bug:
 * it's the household honestly having two different routines.
 */
export function carePlanDocument(pets: Pet[], schedules: CareSchedule[], vetPlans: boolean): PlanChapter[] {
  const drafts: Record<Rhythm, Draft> = { day: new Map(), week: new Map(), weeks: new Map(), year: new Map() };

  // 1. The day's counts.
  for (const spec of DAILY_LINES) {
    for (const pet of pets) {
      if (spec.species && pet.species !== spec.species) continue;
      const suggestion = spec.grams ? suggestedGrams(pet, vetPlans) : suggestedCount(pet, spec.action, vetPlans);
      const value = pet.customPlan?.[spec.key] ?? suggestion;
      if (value == null) continue;
      const overridden = pet.customPlan?.[spec.key] != null && pet.customPlan[spec.key] !== suggestion;
      const line = lineIn(drafts, "day", { id: spec.id, label: spec.label, icon: spec.icon, guideId: spec.guideId, action: spec.action });
      line.entries.push({
        pet,
        value: spec.grams ? `${value} g` : `${value}×`,
        detail: vetPlans ? CARE_PLANS[pet.breed]?.items.find((i) => i.action === spec.action)?.detail : undefined,
        suggested: overridden && suggestion != null ? (spec.grams ? `${suggestion} g` : `${suggestion}×`) : undefined,
        amount: value,
        edit: spec.grams ? { kind: "grams" } : { kind: "count", key: spec.key, max: spec.max },
      });
    }
  }

  // 2. Medication — one line per medicine, however many pets take it. The chip
  //    prints the times when they're set, because with a drug that IS the plan.
  for (const pet of pets) {
    for (const med of pet.meds) {
      const schedule = findSchedule(schedules, pet.id, "meds", med.id);
      const cadence = readCadence(med.frequency ?? "Once daily");
      const slots = schedule?.slots ?? [];
      const times = slots.slice(0, 3).map((s) => compactTime(s.time)).join(" · ");
      const line = lineIn(drafts, cadence.rhythm, {
        id: `med:${med.name.trim().toLowerCase()}`,
        label: med.name,
        icon: "pill",
        action: "meds",
      });
      line.entries.push({
        pet,
        value: slots.length > 0 ? (slots.length > 3 ? `${times} +${slots.length - 3}` : times) : cadence.value,
        detail: [med.dosage, med.frequency].filter(Boolean).join(" · ") || undefined,
        edit: { kind: "med", medId: med.id },
      });
    }
  }

  // 3. Everything the plan describes as a cadence rather than a count.
  for (const pet of pets) {
    const plan = vetPlans ? CARE_PLANS[pet.breed] : undefined;
    const items = plan
      ? plan.items
          .filter((i) => !isStructural(i.action, i.title))
          .map((i) => ({ ...canonFor(i.title), cadence: i.cadence, detail: i.detail }))
      : CUSTOM_ROUTINE[pet.species].map((i) => {
          const canon = CANON.find((c) => c.id === i.id)!;
          return { id: canon.id, label: canon.label, icon: canon.icon, guideId: canon.guideId, action: canon.action, cadence: i.cadence, detail: i.detail };
        });

    for (const item of items) {
      const override = pet.customPlan?.cadences?.[item.id];
      const raw = override ?? item.cadence;
      const read = readCadence(raw);
      const line = lineIn(drafts, read.rhythm, { id: item.id, label: item.label, icon: item.icon, guideId: item.guideId, action: item.action });
      line.entries.push({
        pet,
        value: read.value,
        extra: read.extra,
        detail: item.detail,
        suggested: override && override !== item.cadence ? item.cadence : undefined,
        rawCadence: raw,
        edit: { kind: "cadence", id: item.id },
      });
    }
  }

  const rank = (id: string) => {
    if (id.startsWith("med:")) return 100;
    const daily = DAILY_LINES.findIndex((d) => d.id === id);
    if (daily >= 0) return daily;
    const canon = CANON_ORDER.indexOf(id);
    return canon >= 0 ? 200 + canon : 999;
  };

  return RHYTHMS.map((rhythm) => ({
    rhythm,
    lines: [...drafts[rhythm].values()].sort((a, b) => rank(a.id) - rank(b.id)),
  })).filter((c) => c.lines.length > 0);
}

/* ----------------------------------------------------------------- day rail */

/** One moment in the household's day, already merged across pets. */
export interface DayMark {
  /** Minutes past midnight. */
  minutes: number;
  action: ActionType;
  label: string;
}

/** One pet's day. */
export interface PetDay {
  pet: Pet;
  marks: DayMark[];
}

/** Only the levers that recur within a day belong on a clock. */
const RAIL_ACTIONS: ActionType[] = ["fed", "water", "litter", "walk", "meds"];

/**
 * Every pet's day, one row each, all on the same clock.
 *
 * A single merged household rail answered the wrong question — it said what
 * time things happen without saying to whom, which is exactly the thing a
 * household with two animals needs to know. Stacked and sharing an axis, the
 * rows compare: you can see at a glance that Leo eats twice and Milo three
 * times, and that nobody is walked in the afternoon.
 *
 * Still a figure and not a control. A mark is a time, and the thing you would
 * change from it is a count or a cadence — different question, and it lives in
 * the chapters below. Care doesn't own reminder times at all; the Logs tab does.
 *
 * Every pet gets a row, including one with nothing scheduled. Hiding the empty
 * ones hid the whole figure from anybody who had never set a time, which is the
 * exact person who needed to be told the day could have times in it at all.
 */
export function dayRailMarks(pets: Pet[], schedules: CareSchedule[]): PetDay[] {
  const days: PetDay[] = [];

  for (const pet of pets) {
    const seen = new Map<string, DayMark>();
    for (const s of schedules) {
      if (s.petId !== pet.id) continue;
      if (!RAIL_ACTIONS.includes(s.type)) continue;
      // A cadence measured in days isn't a time of day — a fortnightly bath has
      // no place on a clock that resets every morning.
      if (s.intervalDays != null && s.intervalDays > 1) continue;
      for (const slot of s.slots) {
        const m = /^(\d{1,2}):(\d{2})$/.exec(slot.time);
        if (!m) continue;
        const minutes = Number(m[1]) * 60 + Number(m[2]);
        // Half-hour buckets: two medicines at "around eight" are one moment.
        const key = `${s.type}:${Math.round(minutes / 30)}`;
        const existing = seen.get(key);
        if (!existing || minutes < existing.minutes) {
          seen.set(key, { minutes, action: s.type, label: ACTION_LABEL[s.type] });
        }
      }
    }
    days.push({ pet, marks: [...seen.values()].sort((a, b) => a.minutes - b.minutes) });
  }

  return days;
}

const ACTION_LABEL: Record<ActionType, string> = {
  fed: "Meals",
  water: "Water",
  litter: "Litter",
  walk: "Walk",
  groomed: "Grooming",
  meds: "Medication",
  vet: "Vet",
};

/** The distinct breed notes in a household, in household order. */
export function breedNotes(pets: Pet[]): { breed: string; intro: string }[] {
  const seen = new Set<string>();
  const out: { breed: string; intro: string }[] = [];
  for (const pet of pets) {
    const plan = CARE_PLANS[pet.breed];
    if (!plan || seen.has(pet.breed)) continue;
    seen.add(pet.breed);
    out.push({ breed: pet.breed, intro: plan.intro });
  }
  return out;
}
