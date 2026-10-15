import { useMemo } from "react";
import { cache, useTable } from "./cache";
import { supabase } from "./client";
import { rows } from "./fetch";
import { loadHealth } from "./health";
import { loadLogs, resyncLogs } from "./logs";
import { unitsFromDb, unitsToDb } from "./mappers";
import { loadNotes, resyncNotes } from "./notes";
import { attempt } from "./persist";
import { loadPets } from "./pets";
import { startRealtime, stopRealtime } from "./realtime";
import { loadMembers } from "./members";
import { householdStore, INITIAL_HOUSEHOLD, sessionStore, type HouseholdState } from "./state";
import { useStore } from "./store";
import { showError } from "./toasts";
import { loadWeights, resyncWeights } from "./weights";
import type { Role } from "./types";

export interface HouseholdInfo extends HouseholdState {
  myMemberId: string | null;
  myRole: Role | null;
}

export function useHousehold(): HouseholdInfo {
  const state = useStore(householdStore);
  const userId = useStore(sessionStore).userId;
  const links = useTable("links");
  return useMemo(() => {
    const mine = userId ? links.get(userId) : undefined;
    return { ...state, myMemberId: mine?.memberId ?? null, myRole: mine?.role ?? null };
  }, [state, userId, links]);
}

const petIds = () => cache.all("pets").map((p) => p.id);

function applyHouseholdRow(r: Record<string, unknown>) {
  householdStore.set((s) => ({
    ...s,
    streak: Number(r.streak) || 0,
    units: unitsFromDb(r.units),
  }));
}

/** Resolve which household to show (saved choice, else owned, else first), then load it. */
export async function loadHousehold(userId: string): Promise<void> {
  const ep = cache.epoch();
  try {
    const [profile, memberships] = await Promise.all([
      rows(supabase.from("user_profiles").select("active_household_id").eq("user_id", userId)),
      rows(supabase.from("household_members").select("household_id, role").eq("user_id", userId)),
    ]);
    if (cache.epoch() !== ep) return;
    if (memberships.length === 0) {
      householdStore.set({ ...INITIAL_HOUSEHOLD, ready: true });
      return;
    }
    const saved = profile[0]?.active_household_id;
    const chosen =
      memberships.find((m) => m.household_id === saved) ??
      memberships.find((m) => String(m.role).toLowerCase() === "owner") ??
      memberships[0];
    const householdId = String(chosen.household_id);

    const [household] = await rows(supabase.from("households").select("id, name, units, streak").eq("id", householdId));
    if (!household) throw new Error("household row not readable");
    await Promise.all([loadMembers(householdId), loadPets(householdId), loadLogs(householdId), loadNotes(householdId)]);
    await Promise.all([loadWeights(petIds()), loadHealth(petIds())]);
    if (cache.epoch() !== ep) return;

    householdStore.set({ ...INITIAL_HOUSEHOLD, ready: true, householdId });
    applyHouseholdRow(household);
    startRealtime({
      householdId,
      userId,
      onResync: resync,
      onHouseholdRow: applyHouseholdRow,
      onMembershipLost: switchHousehold,
    });
  } catch (e) {
    if (cache.epoch() !== ep) return;
    if (__DEV__) console.warn("[data] household load failed:", e);
    householdStore.set({ ...INITIAL_HOUSEHOLD, ready: true, loadError: e instanceof Error ? e.message : "load failed" });
    showError("Couldn't load your household. Pull to refresh to try again.");
  }
}

/** Drop everything cached and load again for the signed-in user (join, leave, create, retry). */
export async function switchHousehold(): Promise<void> {
  stopRealtime();
  cache.reset();
  householdStore.set(INITIAL_HOUSEHOLD);
  const userId = sessionStore.get().userId;
  if (userId) await loadHousehold(userId);
  else householdStore.set({ ...INITIAL_HOUSEHOLD, ready: true });
}

export const reloadHousehold = switchHousehold;

// Catch-up after a dropped socket or a return to foreground: growing tables
// (logs, weights, notes) fetch only rows past their cursor, the small ones refetch.
let resyncing: Promise<void> | null = null;
let lastResyncAt = 0;
const MIN_RESYNC_GAP_MS = 3000;

export function resync(full = false): Promise<void> {
  const householdId = householdStore.get().householdId;
  if (!householdId) return Promise.resolve();
  if (resyncing) return resyncing;
  if (!full && Date.now() - lastResyncAt < MIN_RESYNC_GAP_MS) return Promise.resolve();
  const ep = cache.epoch();
  resyncing = (async () => {
    try {
      const [household] = await rows(supabase.from("households").select("id, units, streak").eq("id", householdId));
      if (cache.epoch() !== ep) return;
      if (household) applyHouseholdRow(household);
      // A long gap reloads the whole cached window (picks up back-dated rows and offline deletes).
      await Promise.all([
        loadMembers(householdId),
        loadPets(householdId),
        full ? loadLogs(householdId) : resyncLogs(householdId),
        full ? loadNotes(householdId) : resyncNotes(householdId),
      ]);
      await Promise.all([full ? loadWeights(petIds()) : resyncWeights(petIds()), loadHealth(petIds())]);
    } catch (e) {
      if (__DEV__) console.warn("[data] resync failed:", e);
    } finally {
      lastResyncAt = Date.now();
      resyncing = null;
    }
  })();
  return resyncing;
}

export async function setUnits(units: "metric" | "imperial"): Promise<void> {
  const { householdId, units: before } = householdStore.get();
  if (!householdId || units === before) return;
  householdStore.set((s) => ({ ...s, units }));
  const res = await attempt(() => supabase.from("households").update({ units: unitsToDb(units) }).eq("id", householdId));
  if (!res.ok) {
    householdStore.set((s) => (s.units === units ? { ...s, units: before } : s));
    showError("Couldn't change units");
  }
}

/** households.timezone arrives with a newer migration; a missing column is a no-op. */
export async function setTimezone(tz: string): Promise<void> {
  const householdId = householdStore.get().householdId;
  if (!householdId) return;
  const { error } = await supabase.from("households").update({ timezone: tz }).eq("id", householdId);
  if (error && error.code !== "42703" && __DEV__) console.warn("[data] timezone update failed:", error.message);
}

/** Signup creates no household. Onboarding calls this once, then adds the first pet. */
export async function createHousehold(name?: string): Promise<string> {
  const existing = householdStore.get().householdId;
  if (existing) return existing;
  const userId = sessionStore.get().userId;
  try {
    const { data, error } = await supabase.rpc("create_household", { hname: name?.trim() || "My household" });
    if (error || typeof data !== "string") throw error ?? new Error("create_household returned no id");
    // The RPC sets the active household; repeating it is idempotent and covers read lag.
    if (userId) await supabase.from("user_profiles").upsert({ user_id: userId, active_household_id: data });
    await switchHousehold();
    await setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    return data;
  } catch (e) {
    if (__DEV__) console.warn("[data] create_household failed:", e);
    showError("Couldn't set up your household. Please try again.");
    throw e;
  }
}
