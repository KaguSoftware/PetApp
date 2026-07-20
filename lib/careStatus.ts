// Pure schedule evaluation — no React, no store. Computes the Logs dashboard's
// per-item state (done / due / overdue / …) from schedules + activities + a
// caller-supplied `now`, so the exact same math drives UI rows, the Home meals
// bar, and local-notification planning (lib/notifications.ts) and they can
// never disagree.

import {
  ACTIONS,
  ActionType,
  Activity,
  CareSchedule,
  CareScheduleSlot,
  Pet,
  dailyTarget,
  maskHasDay,
} from "@/lib/data";

const DAY_MS = 86_400_000;
/** An unlogged slot counts as "due" for this long, then flips to "overdue". */
const LATE_MS = 60 * 60_000;

export type CareState = "done" | "due" | "overdue" | "upcoming" | "unscheduled";

export interface CareOccurrence {
  ts: number;
  slot: CareScheduleSlot;
}

export interface CareItemStatus {
  type: ActionType;
  medId?: string;
  /** Most recent matching log — "fed at 12:30 by Mom". */
  last?: { ts: number; memberId: string; grams?: number };
  /** Next scheduled occurrence, when a schedule exists. */
  next?: { ts: number; label?: string; grams?: number };
  state: CareState;
  /** Today's logged count vs target — count-fallback mode and scheduled mode alike. */
  progress?: { count: number; target: number };
}

function parseTime(time: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return { h, m };
}

function slotTs(dayStart: number, slot: CareScheduleSlot): number | null {
  const t = parseTime(slot.time);
  if (!t) return null;
  const d = new Date(dayStart);
  d.setHours(t.h, t.m, 0, 0);
  return d.getTime();
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function sameCalendarDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b);
}

/** Whether the schedule occurs on the calendar day containing `dayStart`. */
function occursOnDay(s: CareSchedule, dayStart: number): boolean {
  if (s.intervalDays != null && s.intervalDays >= 1) {
    const anchorDay = startOfDay(s.anchorTs ?? dayStart);
    const diffDays = Math.round((dayStart - anchorDay) / DAY_MS);
    return diffDays >= 0 && diffDays % s.intervalDays === 0;
  }
  return maskHasDay(s.daysMask, new Date(dayStart).getDay());
}

/**
 * Every occurrence of a schedule inside [fromMs, fromMs + horizonMs), sorted
 * ascending. Slots with an unparseable time are skipped.
 */
export function scheduleOccurrences(s: CareSchedule, fromMs: number, horizonMs: number): CareOccurrence[] {
  const out: CareOccurrence[] = [];
  const end = fromMs + horizonMs;
  const firstDay = startOfDay(fromMs);
  for (let i = 0; ; i++) {
    // Jump to each day's noon, then snap to local midnight — stays on calendar
    // days even when a DST shift makes one of them 23 or 25 hours long.
    const dayStart = startOfDay(firstDay + i * DAY_MS + DAY_MS / 2);
    if (dayStart >= end) break;
    if (!occursOnDay(s, dayStart)) continue;
    for (const slot of s.slots) {
      const ts = slotTs(dayStart, slot);
      if (ts != null && ts >= fromMs && ts < end) out.push({ ts, slot });
    }
  }
  out.sort((a, b) => a.ts - b.ts);
  return out;
}

/** The schedule tracking (pet, type[, medId]), if one exists. */
export function findSchedule(
  schedules: CareSchedule[],
  petId: string,
  type: ActionType,
  medId?: string
): CareSchedule | undefined {
  return schedules.find((s) => s.petId === petId && s.type === type && (medId ? s.medId === medId : s.medId == null));
}

/** Does this activity count for the item being evaluated? A meds log without a
 *  medId (legacy rows, retro logs) counts toward a single-med pet's only med. */
function matchesItem(a: Activity, petId: string, type: ActionType, medId: string | undefined, pet: Pet): boolean {
  if (a.petId !== petId || a.type !== type) return false;
  if (type !== "meds" || medId == null) return true;
  return a.medId === medId || (a.medId == null && pet.meds.length === 1 && pet.meds[0].id === medId);
}

/** Whether a (future or past) occurrence has already been logged for its
 *  window — a log inside the grace band before the slot counts. Used by the
 *  notification sync to skip slots someone already handled ahead of time. */
export function occurrenceLogged(pet: Pet, s: CareSchedule, occTs: number, activities: Activity[]): boolean {
  const graceMs = s.graceMinutes * 60_000;
  return activities.some((a) => matchesItem(a, s.petId, s.type, s.medId, pet) && a.ts >= occTs - graceMs);
}

/**
 * The dashboard state machine. `activities` must be sorted newest-first
 * (the store keeps them that way).
 */
export function careItemStatus(
  pet: Pet,
  type: ActionType,
  medId: string | undefined,
  schedules: CareSchedule[],
  activities: Activity[],
  now: number
): CareItemStatus {
  const last = activities.find((a) => matchesItem(a, pet.id, type, medId, pet));
  const lastInfo = last ? { ts: last.ts, memberId: last.memberId, grams: last.grams } : undefined;
  const todayCount = activities.filter((a) => matchesItem(a, pet.id, type, medId, pet) && sameCalendarDay(a.ts, now)).length;

  const schedule = findSchedule(schedules, pet.id, type, medId);
  if (!schedule || schedule.slots.length === 0) {
    const target = medId != null ? undefined : dailyTarget(pet, type);
    return {
      type,
      medId,
      last: lastInfo,
      state: "unscheduled",
      progress: target != null ? { count: todayCount, target } : undefined,
    };
  }

  const graceMs = schedule.graceMinutes * 60_000;
  // 36h back covers yesterday's last slot even for once-a-day schedules;
  // interval cadences (every N days) look back far enough to find prev too.
  const lookbackMs = Math.max(36 * 3_600_000, (schedule.intervalDays ?? 0) * DAY_MS + DAY_MS);
  const window = scheduleOccurrences(schedule, now - lookbackMs, lookbackMs + 8 * DAY_MS);
  const prev = [...window].reverse().find((o) => o.ts <= now);
  const nextOcc = window.find((o) => o.ts > now);
  const next = nextOcc ? { ts: nextOcc.ts, label: nextOcc.slot.label, grams: nextOcc.slot.grams } : undefined;

  const todaysSlots = occursOnDay(schedule, startOfDay(now)) ? schedule.slots.length : 0;
  const progress = todaysSlots > 0 ? { count: Math.min(todayCount, todaysSlots), target: todaysSlots } : undefined;

  // Inside the grace band before the next slot, the item is asking to be done
  // again — a ✓ from the previous slot no longer applies.
  const inNextWindow = next != null && now >= next.ts - graceMs;

  let state: CareState;
  if (prev == null) {
    // Before the schedule's first-ever occurrence.
    state = inNextWindow ? "due" : "upcoming";
  } else {
    const prevLogged = last != null && last.ts >= prev.ts - graceMs;
    if (prevLogged && !inNextWindow) state = "done";
    else if (prevLogged) state = "due";
    else state = now - prev.ts > LATE_MS ? "overdue" : "due";
  }

  return { type, medId, last: lastInfo, next, state, progress };
}

/**
 * Meals-per-day (or any action's per-day target) with the schedule as the
 * source of truth when one exists — keeps Home's "Meals today" bar and the
 * Logs dashboard in lockstep. Falls back to the plan/species target.
 */
export function effectiveDailyTarget(
  pet: Pick<Pet, "id" | "species" | "breed" | "customPlan">,
  type: ActionType,
  schedules: CareSchedule[]
): number | undefined {
  const schedule = schedules.find((s) => s.petId === pet.id && s.type === type && s.medId == null);
  if (schedule && schedule.slots.length > 0 && occursOnDay(schedule, startOfDay(Date.now()))) {
    return schedule.slots.length;
  }
  return dailyTarget(pet, type);
}

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

/** Human summary of a schedule — "2× daily · 8:00 AM, 8:00 PM" / "Every 3 days · 9:00 AM". */
/**
 * A day-count cadence in the words people actually use. Long intervals are the
 * point: a vet visit is "Every 6 months", never "Every 182 days". Shared by the
 * schedule editor's chips and every subtitle that describes a saved schedule,
 * so the two can never disagree.
 */
export function describeCadence(days: number): string {
  if (days === 1) return "Daily";
  if (days === 7) return "Weekly";
  if (days === 14) return "Every 2 weeks";
  if (days % 365 === 0) {
    const y = days / 365;
    return y === 1 ? "Yearly" : `Every ${y} years`;
  }
  // 28-31 days all mean "a month" to a person; 182 means "6 months".
  const months = Math.round(days / 30.4);
  if (days >= 28 && Math.abs(days - months * 30.4) <= 2) {
    return months === 1 ? "Monthly" : `Every ${months} months`;
  }
  if (days % 7 === 0) return `Every ${days / 7} weeks`;
  return `Every ${days} days`;
}

export function describeSchedule(s: CareSchedule): string {
  const times = s.slots.map((slot) => formatSlotTime(slot.time)).join(", ");
  if (s.intervalDays != null && s.intervalDays >= 1) {
    const cadence = describeCadence(s.intervalDays);
    // Long cadences (a 6-monthly vet visit) don't need a time of day attached —
    // "6 months · 8:00 AM" reads as though the hour matters, and it doesn't.
    return times && s.intervalDays < 30 ? `${cadence} · ${times}` : cadence;
  }
  const daysLabel =
    s.daysMask === 127
      ? `${s.slots.length}× daily`
      : DAY_LETTERS.filter((_, i) => maskHasDay(s.daysMask, i)).join(" ");
  return times ? `${daysLabel} · ${times}` : daysLabel;
}

/** "HH:MM" → the device-locale short time ("6:00 PM"). Falls back to the raw string. */
export function formatSlotTime(time: string): string {
  const t = parseTime(time);
  if (!t) return time;
  const d = new Date();
  d.setHours(t.h, t.m, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Short display name for a status item — the med's name, or the action label. */
export function careItemLabel(pet: Pet, type: ActionType, medId?: string): string {
  if (type === "meds" && medId) return pet.meds.find((m) => m.id === medId)?.name ?? ACTIONS.meds.label;
  return ACTIONS[type].label;
}
