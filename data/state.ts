import type { Session } from "@supabase/supabase-js";
import { cache } from "./cache";
import { MutationError } from "./persist";
import { createStore } from "./store";
import { showError } from "./toasts";
import type { MemberLink } from "./types";

export interface SessionState {
  ready: boolean;
  session: Session | null;
  userId: string | null;
}
export const sessionStore = createStore<SessionState>({ ready: false, session: null, userId: null });

export interface HouseholdState {
  ready: boolean;
  householdId: string | null;
  streak: number;
  units: "metric" | "imperial";
  loadError: string | null;
}
export const INITIAL_HOUSEHOLD: HouseholdState = { ready: false, householdId: null, streak: 0, units: "metric", loadError: null };
export const householdStore = createStore<HouseholdState>(INITIAL_HOUSEHOLD);

export function getMyLink(): MemberLink | undefined {
  const userId = sessionStore.get().userId;
  return userId ? cache.get("links", userId) : undefined;
}

/** Household id for a write, or a toast + MutationError if there isn't one yet. */
export function requireHouseholdId(): string {
  const id = householdStore.get().householdId;
  if (!id) {
    const text = "Your household isn't ready yet. Try again in a moment.";
    showError(text);
    throw new MutationError(text);
  }
  return id;
}
