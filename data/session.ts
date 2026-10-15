import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import { cache } from "./cache";
import { supabase } from "./client";
import { stopRealtime } from "./realtime";
import { householdStore, INITIAL_HOUSEHOLD, sessionStore } from "./state";
import { useStore } from "./store";
import { clearToasts } from "./toasts";

export function useSession() {
  return useStore(sessionStore);
}

function publish(session: Session | null) {
  sessionStore.set({ ready: true, session, userId: session?.user.id ?? null });
}

/** Read the persisted session, then follow auth changes. Returns the unsubscribe. */
export function watchSession(): () => void {
  let cancelled = false;
  void supabase.auth.getSession().then(({ data }) => {
    if (!cancelled) publish(data.session);
  });
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => publish(session));
  return () => {
    cancelled = true;
    subscription.unsubscribe();
  };
}

/** Clears the cache, channels, timers and toasts. Safe to call repeatedly. */
export function teardown(): void {
  stopRealtime();
  cache.reset();
  clearToasts();
  householdStore.set(INITIAL_HOUSEHOLD);
}

// Keys left by the pre-rebuild store (its snapshot cached a user's whole household).
const LEGACY_PREFIXES = ["petpal.snapshot.", "petpal.shortcuts."];

export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } finally {
    teardown();
    try {
      const keys = await AsyncStorage.getAllKeys();
      await AsyncStorage.multiRemove(keys.filter((k) => LEGACY_PREFIXES.some((p) => k.startsWith(p))));
    } catch (e) {
      if (__DEV__) console.warn("[data] storage cleanup failed:", e);
    }
  }
}
