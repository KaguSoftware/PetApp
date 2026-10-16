const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar date as yyyy-mm-dd, `daysFromToday` days away (negative = past). */
export function isoDay(daysFromToday = 0, from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + daysFromToday);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** yyyy-mm-dd plus whole months, clamped to the end of shorter months. */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const first = new Date(y, m - 1 + months, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return isoDay(0, new Date(first.getFullYear(), first.getMonth(), Math.min(d, last)));
}


/** Parses yyyy-mm-dd as local noon, which no timezone shift can move to another day. */
export function dateOf(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

/** Local calendar date of a Date as yyyy-mm-dd (what the native date pickers hand back). */
export function isoOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
