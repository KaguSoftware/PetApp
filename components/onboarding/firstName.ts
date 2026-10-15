/** Best-effort first name from auth metadata or a member card; null when nothing readable. */
export function firstNameOf(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.includes("@") || trimmed.toLowerCase() === "you") return null;
  return trimmed.split(/\s+/)[0] ?? null;
}
