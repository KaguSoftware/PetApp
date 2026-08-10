// The Home model — pure, no React, no store.
//
// Home asks a different question from the three pages beside it. Care says what
// the routine IS. Logs is where you DO it. Inbox is what is being ASKED. Home
// says how each animal is RIGHT NOW — and it says it in paint, not prose: a
// ring, a strip of state dots, a row of tinted tiles. The only sentences this
// file writes are accessibility labels.
//
// Everything here is a *reading* of state, never a second definition of one:
// every figure comes out of `careStatus` / `careDashboard` — the same machine
// Logs, Care and Inbox read — which is why a lever can't say "late" here and
// "due" one tab over.

import {
  householdLevers,
  leverApplies,
  petDayProgress,
  summarizeLever,
  type CareTone,
  type LeverSummary,
} from "@/lib/careDashboard";
import type { ActionType, CareSchedule, Activity, Pet, Reminder } from "@/lib/data";

const DAY_MS = 86_400_000;

/** Severity order for picking flags. Mirrors careDashboard's private
 *  TONE_RANK — kept in step by hand. */
const TONE_RANK: Record<CareTone, number> = { overdue: 4, due: 3, open: 2, idle: 1, done: 0 };

/** One word per tile. The tile's colour says the state; the label only has to
 *  say which lever it is. */
const TILE_LABEL: Record<ActionType, string> = {
  fed: "Meals",
  water: "Water",
  litter: "Litter",
  walk: "Walk",
  groomed: "Groom",
  meds: "Meds",
  vet: "Vet",
};

/** What the animal is short of — a11y labels and the hot line's noun. */
const NEEDS: Record<ActionType, string> = {
  fed: "a meal",
  water: "fresh water",
  litter: "a clean litter box",
  walk: "a walk",
  groomed: "a groom",
  meds: "a dose",
  vet: "a checkup",
};

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function clock(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/* ------------------------------------------------------------------- tasks */

/** What a tile's tap does. `feed` and `log` act in place; `route` is a door —
 *  meds and vet need more input than one tap carries. */
export type TaskAction = { kind: "feed" } | { kind: "route"; href: "/logs" } | { kind: "log" };

export interface PetTask {
  id: string;
  type: ActionType;
  /** Single word under the tile. */
  label: string;
  tone: CareTone;
  /** Set only while the lever is owed loudly: "late", "due now", "2 doses due". */
  hot?: string;
  /** "1 of 3" style fraction while a count target has work left. */
  progress?: string;
  action: TaskAction;
}

/* ------------------------------------------------------------------- cards */

export interface PetDayCard {
  pet: Pet;
  /** Day progress across every lever asking for something today. */
  progress: { required: number; done: number; overdue: number; fraction: number };
  /** The loudest state anything of this pet's is in: the card's flag colour. */
  tone: CareTone;
  /** Stable lever order — dots on the card, tiles below, same sequence. */
  tasks: PetTask[];
  /** The whole card in one spoken sentence. */
  a11ySummary: string;
}

/* -------------------------------------------------------------- what's ahead */

export type NoteTint = "quiet" | "warn" | "late";

export interface AheadItem {
  id: string;
  label: string;
  who?: string;
  when: string;
  tint: NoteTint;
}

export interface HomeModel {
  /** Household order, stable — cards must not reorder under a state change. */
  cards: PetDayCard[];
  /** The pet in the worst state, or null when nobody needs anything. */
  neediestId: string | null;
  ahead: AheadItem[];
  openReminders: number;
}

/* ---------------------------------------------------------------- readings */

/** The levers that earn a tile on this pet's card. */
function dailyLevers(pet: Pet): ActionType[] {
  const out: ActionType[] = ["fed", "water"];
  if (pet.species === "cat") out.push("litter");
  else out.push("walk");
  if (pet.meds.length > 0) out.push("meds");
  return out;
}

/**
 * Every reading below comes out of the lever summaries computed once at the top
 * of `homeModel`, never from a fresh `careItemStatus` call — one evaluation,
 * many views, no way for a dot and a tile to disagree.
 */
function taskFor(pet: Pet, type: ActionType, byLever: Map<ActionType, LeverSummary>): PetTask | undefined {
  const entry = byLever.get(type)?.pets.find((p) => p.pet.id === pet.id);
  if (!entry) return undefined;
  const medsDue = entry.medsDue ?? 0;
  const p = entry.status.progress;
  return {
    id: `${pet.id}:${type}`,
    type,
    label: TILE_LABEL[type],
    tone: entry.tone,
    hot:
      entry.tone === "overdue"
        ? "late"
        : entry.tone === "due"
          ? medsDue > 1
            ? `${medsDue} doses due`
            : "due now"
          : undefined,
    progress: entry.tone === "open" && p && p.target > 1 ? `${p.count} of ${p.target}` : undefined,
    action: type === "fed" ? { kind: "feed" } : type === "meds" || type === "vet" ? { kind: "route", href: "/logs" } : { kind: "log" },
  };
}

/** The card, spoken. The screen paints; VoiceOver still gets the sentence. */
function a11ySummaryFor(pet: Pet, tasks: PetTask[], progress: { required: number; done: number }): string {
  const worst = tasks.reduce<PetTask | undefined>((acc, t) => (!acc || TONE_RANK[t.tone] > TONE_RANK[acc.tone] ? t : acc), undefined);
  const state =
    worst && worst.tone === "overdue"
      ? `needs ${NEEDS[worst.type]}, running late`
      : worst && worst.tone === "due"
        ? `needs ${NEEDS[worst.type]} now`
        : worst && worst.tone === "open"
          ? "still has things to do"
          : progress.required > 0
            ? "is all caught up"
            : "has nothing on today";
  const counts = progress.required > 0 ? ` ${progress.done} of ${progress.required} done.` : "";
  return `${pet.name} ${state}.${counts}`;
}

/* ---------------------------------------------------------------- the sentence */

/** How soon, in the coarsest unit that still means something. */
export function whenLabel(ts: number, now: number): string {
  if (ts <= now) return "late";
  const todayEnd = startOfDay(now) + DAY_MS;
  if (ts < todayEnd) return clock(ts);
  if (ts < todayEnd + DAY_MS) return "tomorrow";
  if (ts < startOfDay(now) + 7 * DAY_MS) return new Date(ts).toLocaleDateString([], { weekday: "long" });
  return new Date(ts).toLocaleDateString([], { day: "numeric", month: "short" });
}

/* -------------------------------------------------------------------- assembly */

export function homeModel(
  pets: Pet[],
  schedules: CareSchedule[],
  activities: Activity[],
  reminders: Reminder[],
  now: number
): HomeModel {
  // Computed once, read everywhere: every ring, dot and tile below is a view
  // onto this one evaluation.
  const summaries = householdLevers(pets).map((type) => summarizeLever(type, pets, schedules, activities, now));
  const byLever = new Map(summaries.map((s) => [s.type, s]));

  const cards: PetDayCard[] = pets.map((pet) => {
    // Stable lever order on purpose: dots and tiles that re-sort themselves as
    // states change make the page unreadable at a glance.
    const tasks = dailyLevers(pet)
      .filter((type) => leverApplies(pet, type))
      .map((type) => taskFor(pet, type, byLever))
      .filter((task): task is PetTask => task != null);

    const day = petDayProgress(pet, summaries);
    const progress = { ...day, fraction: day.required > 0 ? day.done / day.required : 1 };
    const tone = tasks.reduce<CareTone>((worst, t) => (TONE_RANK[t.tone] > TONE_RANK[worst] ? t.tone : worst), "done");

    return { pet, progress, tone, tasks, a11ySummary: a11ySummaryFor(pet, tasks, day) };
  });

  // The animal in the worst state wins the auto-selection; ties go to household
  // order. Nobody in trouble → null, and the page follows the first card.
  let neediest: PetDayCard | undefined;
  for (const card of cards) {
    if (TONE_RANK[card.tone] <= TONE_RANK.idle) continue;
    if (!neediest || TONE_RANK[card.tone] > TONE_RANK[neediest.tone]) neediest = card;
  }

  const open = reminders.filter((r) => !r.done);
  const ahead: AheadItem[] = open
    // Raised alerts first — they are the app telling you something rather than
    // the family reminding itself — then simply by time.
    .sort((a, b) => Number(!!b.alert) - Number(!!a.alert) || a.due - b.due)
    .slice(0, 2)
    .map((r) => ({
      id: r.id,
      label: r.title,
      who: pets.find((p) => p.id === r.petId)?.name,
      when: whenLabel(r.due, now),
      tint: r.alert || r.due <= now ? "late" : r.due < startOfDay(now) + DAY_MS ? "warn" : "quiet",
    }));

  return {
    cards,
    neediestId: neediest?.pet.id ?? null,
    ahead,
    openReminders: open.length,
  };
}
