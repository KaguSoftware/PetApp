import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * An invite deep link (petpal://join?code=…) tapped while signed OUT can't
 * open /join — the route is session-guarded. The code parks here across the
 * sign-in/sign-up round trip and the root layout consumes it right after
 * hydration, so the invitee lands on the join screen they were promised.
 */
const KEY = "petpal.pendingInviteCode";

/** Which link shape was tapped. `code` = a 0027 invite code (XXXX-XXXX);
 *  `f` = a legacy web-demo household UUID. They redeem through completely
 *  different paths, so the kind has to survive the round trip — replaying a
 *  UUID as a code turns it into a garbage 8-char string that can never match. */
export type PendingInvite = { kind: "code" | "f"; value: string };

export async function setPendingInvite(invite: PendingInvite): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, `${invite.kind}:${invite.value}`);
  } catch (e) {
    console.error("[petpal] pending invite stash failed:", e);
  }
}

function parse(stored: string | null): PendingInvite | null {
  if (!stored) return null;
  const sep = stored.indexOf(":");
  // Un-prefixed values are from a build before the kind was recorded — those
  // could only ever have been codes.
  if (sep < 0) return { kind: "code", value: stored };
  const kind = stored.slice(0, sep);
  return { kind: kind === "f" ? "f" : "code", value: stored.slice(sep + 1) };
}

/** Read without clearing — for showing "you have a pending invite" affordances. */
export async function peekPendingInvite(): Promise<PendingInvite | null> {
  try {
    return parse(await AsyncStorage.getItem(KEY));
  } catch {
    return null;
  }
}

/** Read-and-clear: the caller is committing to routing the user to /join. */
export async function consumePendingInvite(): Promise<PendingInvite | null> {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    if (stored) await AsyncStorage.removeItem(KEY);
    return parse(stored);
  } catch {
    return null;
  }
}
