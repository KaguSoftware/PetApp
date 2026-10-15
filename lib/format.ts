// Pure date / relative-time / unit formatting helpers. No React, no I/O.

const DAY_MS = 86_400_000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const KG_PER_LB = 0.45359237;

export type Units = "metric" | "imperial";

function startOfDay(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Whole calendar days between two instants, in local time (DST safe). */
export function calendarDaysBetween(a: number, b: number): number {
  return Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS);
}

/** "just now", "5 min ago", "3 h ago", "Yesterday", "4 days ago", then a short date. */
export function relativeTime(ts: number, now: number = Date.now()): string {
  const diff = now - ts;
  if (diff < 0 || diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24 && calendarDaysBetween(ts, now) === 0) return `${hours} h ago`;
  const days = calendarDaysBetween(ts, now);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return shortDate(ts, now);
}

/** "12 Oct" (year appended when not the current year). */
export function shortDate(ts: number, now: number = Date.now()): string {
  const d = new Date(ts);
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === new Date(now).getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** "Today", "Yesterday", or "Mon 12 Oct" (year appended when not the current year). */
export function dayLabel(ts: number, now: number = Date.now()): string {
  const days = calendarDaysBetween(ts, now);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  const d = new Date(ts);
  return `${WEEKDAYS[d.getDay()]} ${shortDate(ts, now)}`;
}

/** Local clock time, 24h: "08:05". */
export function clockTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** "12 Oct 2025" from a yyyy-mm-dd string; returns the input untouched if it doesn't parse. */
export function formatDate(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return date;
  const month = MONTHS[Number(m[2]) - 1];
  if (!month) return date;
  return `${Number(m[3])} ${month} ${m[1]}`;
}

/** Local yyyy-mm-dd for an epoch ms. */
export function toDateString(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Whole days from `now` (local) until a yyyy-mm-dd date; negative when past. NaN if unparseable. */
export function daysUntil(date: string, now: number = Date.now()): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return Number.NaN;
  const target = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  return Math.round((target - startOfDay(now)) / DAY_MS);
}

function trim(n: number, digits: number): string {
  return String(Number(n.toFixed(digits)));
}

/** Weight number in the household's units, without the suffix. */
export function kgValue(kg: number, units: Units): number {
  return units === "imperial" ? kg / KG_PER_LB : kg;
}

/** "4.2 kg" or "9.3 lb". */
export function kgToDisplay(kg: number, units: Units): string {
  return units === "imperial" ? `${trim(kg / KG_PER_LB, 1)} lb` : `${trim(kg, 1)} kg`;
}

/** Signed delta, "+0.2 kg" / "-0.1 lb". */
export function kgDeltaDisplay(deltaKg: number, units: Units): string {
  const v = kgValue(deltaKg, units);
  const rounded = Number(v.toFixed(1));
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "";
  return `${sign}${trim(Math.abs(v), 1)} ${units === "imperial" ? "lb" : "kg"}`;
}

/** Parse user input in the display units back to kg. Null when not a positive number. */
export function parseWeightInput(text: string, units: Units): number | null {
  const n = Number(text.trim().replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return units === "imperial" ? n * KG_PER_LB : n;
}

/** "2 y", "5 mo" or "3 wk" from a yyyy-mm-dd birth date; null when unknown. */
export function ageLabel(birthDate: string | null, now: number = Date.now()): string | null {
  if (!birthDate) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate);
  if (!m) return null;
  const born = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const cur = new Date(now);
  let months = (cur.getFullYear() - born.getFullYear()) * 12 + cur.getMonth() - born.getMonth();
  if (cur.getDate() < born.getDate()) months -= 1;
  if (months < 0) return null;
  if (months >= 24) return `${Math.floor(months / 12)} y`;
  if (months >= 1) return `${months} mo`;
  return `${Math.max(1, Math.floor(calendarDaysBetween(born.getTime(), now) / 7))} wk`;
}

/** True for a real calendar date written as yyyy-mm-dd. */
export function isValidDateString(date: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]);
}
