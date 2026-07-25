import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * An invite deep link (petpal://join?code=…) tapped while signed OUT can't
 * open /join — the route is session-guarded. The code parks here across the
 * sign-in/sign-up round trip and the root layout consumes it right after
 * hydration, so the invitee lands on the join screen they were promised.
 */
const KEY = "petpal.pendingInviteCode";

export async function setPendingInviteCode(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, code);
  } catch (e) {
    console.error("[petpal] pending invite stash failed:", e);
  }
}

/** Read without clearing — the onboarding screen shows a banner off this. */
export async function peekPendingInviteCode(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Read-and-clear: the caller is committing to routing the user to /join. */
export async function consumePendingInviteCode(): Promise<string | null> {
  try {
    const code = await AsyncStorage.getItem(KEY);
    if (code) await AsyncStorage.removeItem(KEY);
    return code;
  } catch {
    return null;
  }
}
