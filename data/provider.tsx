import { useEffect } from "react";
import { loadHousehold } from "./household";
import { teardown, useSession, watchSession } from "./session";
import { householdStore, INITIAL_HOUSEHOLD } from "./state";

/** Composes session + household loading + realtime lifecycle. Mount once near the root. */
export function DataProvider({ children }: { children: React.ReactNode }) {
  const { ready, userId } = useSession();

  useEffect(() => watchSession(), []);

  useEffect(() => {
    if (!ready) return;
    if (!userId) {
      householdStore.set({ ...INITIAL_HOUSEHOLD, ready: true });
      return;
    }
    void loadHousehold(userId);
    // Runs on sign-out and on switching accounts: nothing of the old user survives.
    return teardown;
  }, [ready, userId]);

  return <>{children}</>;
}
