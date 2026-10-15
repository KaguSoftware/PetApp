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

export function dayLabel(daysFromToday: number): string {
  if (daysFromToday === 0) return "Today";
  if (daysFromToday === -1) return "Yesterday";
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}
