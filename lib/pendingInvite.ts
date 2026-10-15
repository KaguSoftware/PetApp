import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * An invite deep link (peting://join?code=...) tapped while signed OUT can't
 * open /join - the route is session-guarded. The code parks here across the
 * sign-in/sign-up round trip and the root layout consumes it right after
 * hydration, so the invitee lands on the join screen they were promised.
 */
const KEY = "petpal.pendingInviteCode";
/** A parked code older than this is dropped rather than replayed. */
const MAX_AGE_MS = 24 * 3_600_000;

/** XXXX-XXXX from any spelling of an 8-char A-Z0-9 code, or null if it isn't one. */
export function normalizeInviteCode(input: string): string | null {
  const compact = input.toUpperCase().replace(/[\s-]/g, "");
  return /^[A-Z0-9]{8}$/.test(compact) ? `${compact.slice(0, 4)}-${compact.slice(4)}` : null;
}

export async function setPendingInvite(code: string): Promise<void> {
  const normalized = normalizeInviteCode(code);
  if (!normalized) return;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ code: normalized, at: Date.now() }));
  } catch (e) {
    console.error("[peting] pending invite stash failed:", e);
  }
}

function parse(stored: string | null): string | null {
  if (!stored) return null;
  try {
    const { code, at } = JSON.parse(stored) as { code?: unknown; at?: unknown };
    if (typeof code !== "string" || typeof at !== "number" || Date.now() - at > MAX_AGE_MS) return null;
    return normalizeInviteCode(code);
  } catch {
    return null;
  }
}

/** Read without clearing - for showing "you have a pending invite" affordances. */
export async function peekPendingInvite(): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    const code = parse(stored);
    if (stored && !code) await AsyncStorage.removeItem(KEY);
    return code;
  } catch {
    return null;
  }
}

/** Read-and-clear: the caller is committing to routing the user to /join. */
export async function consumePendingInvite(): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    if (stored) await AsyncStorage.removeItem(KEY);
    return parse(stored);
  } catch {
    return null;
  }
}
