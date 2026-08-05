// The Inbox's document model.
//
// Two screens used to answer half of this question each. `/activity` listed
// what the family had been TOLD (auto-raised care alerts, then the feed);
// `/reminders` listed what it had ASKED ITSELF to do. They shared a clock, a
// pet and a notion of "late" — and neither could show the third thing that
// actually pings a phone: the care schedules the Logs tab sets, which
// `lib/notifications.ts` has always merged with reminders before scheduling.
// One page, one merge, in the same order the OS will deliver them.
//
// The shape is borrowed from the two pages this app already got right:
// `carePlan.ts` gives it chapters (there by rhythm, here by horizon), and
// `careDashboard.ts` gives it the tone vocabulary and the clock strings, so a
// thing reads the same here as it does on the Logs tile it came from.
//
// Pure — no React, no store — so the same document can back the page, a test,
// or a notification digest later.

import { clockLabel, householdLevers, leverStatusLine, sinceLabel, summarizeLever } from "@/lib/careDashboard";
import { careItemLabel, occurrenceLogged, scheduleOccurrences } from "@/lib/careStatus";
import {
  ALERT_KIND_TAG,
  nextRepeatDue,
  type ActionType,
  type Activity,
  type CareSchedule,
  type Pet,
  type Reminder,
  type RepeatKind,
} from "@/lib/data";

const DAY_MS = 86_400_000;

/** The five chapters. Time, not category — the axis an inbox is actually read on. */
export type Horizon = "now" | "today" | "tomorrow" | "week" | "later";

export const HORIZONS: Horizon[] = ["now", "today", "tomorrow", "week", "later"];

export const HORIZON_LABEL: Record<Horizon, string> = {
  now: "Needs you now",
  today: "Later today",
  tomorrow: "Tomorrow",
  week: "This week",
  later: "Later",
};

/**
 * Four tones, ranked. `alert` is the app telling you something is wrong;
 * `late` is a time that has passed; `due` is today; `planned` is everything
 * that hasn't come round yet and is therefore only information.
 */
export type InboxTone = "alert" | "late" | "due" | "planned";

/**
 * Where an item came from, which is also what can be done to it. Only
 * `alert`/`reminder` carry a `Reminder`, so only they can be checked off; a
 * `care` item is a schedule occurrence and is answered by logging it.
 */
export type InboxKind = "alert" | "reminder" | "care";

export interface InboxItem {
  /** Stable across ticks: a reminder id, or `care:<scheduleKey>:<ts>`. */
  id: string;
  kind: InboxKind;
  tone: InboxTone;
  horizon: Horizon;
  title: string;
  pet?: Pet;
  /** When it is (or was) due. `care` roll-ups use `now`, having no single slot. */
  ts: number;
  /** "Due 3h ago" · "6:00 PM" · "tomorrow 8:00 AM" · "Aug 12 · 9:00 AM". */
  when: string;
  /** "every few days", when the reminder repeats. */
  repeat?: string;
  tag?: string;
  /** The care lever behind the item — colours its glyph and says where it leads. */
  action?: ActionType;
  vetId?: string;
  /** Present iff the item IS a reminder row: the check-off and the delete need it. */
  reminder?: Reminder;
  /** The sentence the expanded row shows. */
  body: string;
}

export interface InboxChapter {
  horizon: Horizon;
  items: InboxItem[];
}

export interface InboxDocument {
  chapters: InboxChapter[];
  /** Completed reminders, newest due first — the page keeps them folded away. */
  done: Reminder[];
  counts: { now: number; today: number; ahead: number; alerts: number };
  /** Per-pet open counts, for the summary's faces. Household order. */
  perPet: { pet: Pet; open: number; late: number }[];
  /** The soonest thing still ahead, for the "nothing until…" line. */
  next?: InboxItem;
}

/** The axes the page's filter sheet offers. Applied here so one rule serves every section. */
export interface InboxFilter {
  petId?: string | null;
  types?: Set<ActionType>;
  tags?: Set<string>;
}

const REPEAT_LABEL: Record<RepeatKind, string> = {
  daily: "daily",
  weekly: "weekly",
  every_n_days: "every few days",
};

/** "every 3 days" — shared with the add sheet so the chip and the row agree. */
export function repeatLabel(kind: RepeatKind, interval?: number): string {
  return kind === "every_n_days" ? `every ${Math.max(1, Math.round(interval ?? 1))} days` : REPEAT_LABEL[kind];
}

/**
 * The one clock string on this page. Past is said as elapsed time ("Due 3h
 * ago") because that is the thing you are judging; future is said as a clock,
 * and past a week out a weekday alone stops being enough to place it.
 */
export function whenLabel(ts: number, now: number): string {
  if (ts <= now) return `Due ${sinceLabel(ts, now)}`;
  if (ts - now > 6 * DAY_MS) {
    const date = new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
    return `${date} · ${new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }
  return clockLabel(ts, now);
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function horizonOf(ts: number, now: number): Horizon {
  if (ts <= now) return "now";
  const today = startOfDay(now);
  if (ts < today + DAY_MS) return "today";
  if (ts < today + 2 * DAY_MS) return "tomorrow";
  if (ts < today + 8 * DAY_MS) return "week";
  return "later";
}

/**
 * Care schedules only reach to the end of tomorrow.
 *
 * A household with times set produces five or six slots a day, so a seven-day
 * horizon would bury every reminder under forty rows of "Milo · Dinner". The
 * whole week's rhythm is a different question, and the Care tab's day rail
 * already answers it; here the schedule is only present far enough ahead to
 * explain the notifications you are about to get.
 */
function careHorizonEnd(now: number): number {
  return startOfDay(now) + 2 * DAY_MS;
}

/**
 * One filter rule for every section, applied AFTER the whole document is built.
 *
 * Built-then-filtered rather than filtered-while-building, so the summary's
 * per-pet counts can be read off the unfiltered set — narrowing to one pet must
 * not make every other pet report "clear". An item with no pet of its own (a
 * household-wide roll-up: "3 pets are late") survives a pet filter, since the
 * pet you picked is one of the ones it is talking about.
 */
function passesFilter(f: InboxFilter | undefined, petId: string | undefined, type: ActionType | undefined, tag: string | undefined): boolean {
  if (!f) return true;
  if (f.petId != null && petId != null && petId !== f.petId) return false;
  if (f.types && f.types.size > 0 && (type == null || !f.types.has(type))) return false;
  if (f.tags && f.tags.size > 0 && (tag == null || !f.tags.has(tag))) return false;
  return true;
}

function itemPasses(item: InboxItem, f: InboxFilter | undefined): boolean {
  return passesFilter(f, item.pet?.id, item.action, item.tag);
}

/**
 * Everything the household is being told, in the order it will be told it.
 *
 * Three sources, one list:
 *   1. Care alerts — reminders the app raised itself (over-feeding, a missed
 *      week). Always `now`: an unresolved warning has no future tense.
 *   2. Reminders — what the family wrote down, past-due ones rolled forward if
 *      they repeat, exactly as the notification scheduler rolls them.
 *   3. Care schedules — the next two days of slots that haven't been logged
 *      yet, plus one roll-up per lever that is currently running late.
 */
export function inboxDocument(
  reminders: Reminder[],
  pets: Pet[],
  schedules: CareSchedule[],
  activities: Activity[],
  now: number,
  filter?: InboxFilter
): InboxDocument {
  const petById = (id: string) => pets.find((p) => p.id === id);
  const items: InboxItem[] = [];

  // 1. Alerts. Belt-and-braces dedupe by pet + title: migration 0023's unique
  //    index stops new duplicates at the DB, but pre-migration rows survive.
  const seenAlert = new Set<string>();
  for (const r of reminders) {
    if (!r.alert || r.done) continue;
    const key = `${r.petId}|${r.title}`;
    if (seenAlert.has(key)) continue;
    seenAlert.add(key);
    const tag = r.tag ?? (r.alertKind ? ALERT_KIND_TAG[r.alertKind] : undefined);
    const pet = petById(r.petId);
    items.push({
      id: r.id,
      kind: "alert",
      tone: "alert",
      horizon: "now",
      title: r.title,
      pet,
      ts: r.due,
      when: whenLabel(r.due, now),
      tag,
      action: r.alertKind as ActionType | undefined,
      vetId: r.vetId,
      reminder: r,
      body: pet
        ? `${pet.name} needs attention: ${r.title.toLowerCase()}. Clearing it here tells the whole family it's handled.`
        : "This alert was raised automatically. Clearing it tells the whole family it's handled.",
    });
  }

  // 2. Reminders. A past-due repeating one shows its NEXT occurrence, which is
  //    the moment the phone will actually ring — the same roll-forward
  //    `syncScheduledNotifications` does, so the page can't promise a time the
  //    OS queue doesn't hold.
  for (const r of reminders) {
    if (r.done || r.alert) continue;
    const ts = r.due > now || !r.repeatKind ? r.due : nextRepeatDue(r.due, r.repeatKind, r.repeatInterval, now);
    const pet = petById(r.petId);
    const repeat = r.repeatKind ? repeatLabel(r.repeatKind, r.repeatInterval) : undefined;
    items.push({
      id: r.id,
      kind: "reminder",
      tone: ts <= now ? "late" : horizonOf(ts, now) === "today" ? "due" : "planned",
      horizon: horizonOf(ts, now),
      title: r.title,
      pet,
      ts,
      when: whenLabel(ts, now),
      repeat,
      tag: r.tag,
      reminder: r,
      body: repeat
        ? `Checking this off rolls it forward to ${clockLabel(nextRepeatDue(ts, r.repeatKind!, r.repeatInterval, now), now)}.`
        : "Checking this off completes it for the whole family.",
    });
  }

  // 3a. Care schedules — the slots ahead that nobody has answered early.
  const careEnd = careHorizonEnd(now);
  for (const s of schedules) {
    const pet = petById(s.petId);
    if (!pet) continue;
    const label = careItemLabel(pet, s.type, s.medId);
    for (const occ of scheduleOccurrences(s, now, Math.max(0, careEnd - now))) {
      if (occ.ts <= now || occurrenceLogged(pet, s, occ.ts, activities)) continue;
      items.push({
        id: `care:${s.id}:${occ.ts}`,
        kind: "care",
        tone: horizonOf(occ.ts, now) === "today" ? "due" : "planned",
        horizon: horizonOf(occ.ts, now),
        title: occ.slot.label ?? label,
        pet,
        ts: occ.ts,
        when: whenLabel(occ.ts, now),
        action: s.type,
        body: `${pet.name} — ${label.toLowerCase()}. Everyone gets a notification at this time; logging it early skips the ping.`,
      });
    }
  }

  // 3b. Care running late — ONE roll-up per lever rather than a row per pet per
  //     missed slot, which is the Logs grid transcribed into a list. The tile
  //     already owns that detail; here it only has to say "this is late" and
  //     point at the tile.
  for (const type of householdLevers(pets)) {
    const summary = summarizeLever(type, pets, schedules, activities, now);
    if (summary.counts.overdue === 0) continue;
    const late = summary.pets.find((p) => p.tone === "overdue");
    items.push({
      id: `care-late:${type}`,
      kind: "care",
      tone: "late",
      horizon: "now",
      title: careItemLabel(late?.pet ?? pets[0], type),
      pet: summary.counts.overdue === 1 ? late?.pet : undefined,
      ts: now,
      when: leverStatusLine(summary, now),
      action: type,
      body:
        summary.counts.overdue === 1 && late
          ? `${late.pet.name} is past a scheduled ${careItemLabel(late.pet, type).toLowerCase()}. Log it from the Logs tab and this clears itself.`
          : `${summary.counts.overdue} pets are past a scheduled ${careItemLabel(pets[0], type).toLowerCase()}. Logging it from the Logs tab clears this.`,
    });
  }

  // The filter lands here, once, on the finished document — see `passesFilter`.
  const shown = filter ? items.filter((i) => itemPasses(i, filter)) : items;

  const chapters: InboxChapter[] = HORIZONS.map((horizon) => ({
    horizon,
    items: shown.filter((i) => i.horizon === horizon).sort((a, b) => a.ts - b.ts),
  })).filter((c) => c.items.length > 0);

  const done = reminders
    .filter((r) => r.done && passesFilter(filter, r.petId, undefined, r.tag))
    .sort((a, b) => b.due - a.due);

  const nowCount = shown.filter((i) => i.horizon === "now").length;
  const todayCount = shown.filter((i) => i.horizon === "today").length;

  // Read off the UNFILTERED set: the faces are how you choose a filter, so they
  // have to keep telling the truth about the pets you are not looking at.
  const perPet = pets.map((pet) => {
    const mine = items.filter((i) => i.pet?.id === pet.id);
    return {
      pet,
      open: mine.length,
      late: mine.filter((i) => i.tone === "alert" || i.tone === "late").length,
    };
  });

  return {
    chapters,
    done,
    counts: {
      now: nowCount,
      today: todayCount,
      ahead: shown.length - nowCount - todayCount,
      alerts: shown.filter((i) => i.kind === "alert").length,
    },
    perPet,
    next: shown.filter((i) => i.ts > now).sort((a, b) => a.ts - b.ts)[0],
  };
}

/**
 * The one line the summary leads with. Ordered by what should pull someone in —
 * the same ordering `leverStatusLine` uses on a Logs tile, for the same reason.
 */
export function inboxHeadline(doc: InboxDocument, now: number): { text: string; tone: InboxTone | "clear" } {
  if (doc.counts.now > 0) {
    return { text: doc.counts.now === 1 ? "1 needs you now" : `${doc.counts.now} need you now`, tone: doc.counts.alerts > 0 ? "alert" : "late" };
  }
  if (doc.counts.today > 0) {
    return { text: doc.counts.today === 1 ? "1 more today" : `${doc.counts.today} more today`, tone: "due" };
  }
  if (doc.next) return { text: `Nothing until ${clockLabel(doc.next.ts, now)}`, tone: "planned" };
  return { text: "All clear", tone: "clear" };
}
