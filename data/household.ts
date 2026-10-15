import { useMemo } from "react";
import { cache, useTable } from "./cache";
import { supabase } from "./client";
import { rows } from "./fetch";
import { loadHealth } from "./health";
import { loadLogs, resyncLogs } from "./logs";
import { unitsFromDb, unitsToDb } from "./mappers";
import { loadNotes, resyncNotes } from "./notes";
import { attempt, MutationError } from "./persist";
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

const deviceTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Yesterday (yyyy-mm-dd) as the calendar reads in `timeZone`; an unknown zone falls back to the device's. */
export function yesterdayIn(timeZone: string | null | undefined, now = Date.now()): string {
  let today: string | null = null;
  try {
    today = new Intl.DateTimeFormat("en-CA", { timeZone: timeZone || undefined, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    // RangeError for a zone this runtime does not know.
  }
  if (!today || !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    const d = new Date(now);
    today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  const [y, m, d] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

/**
 * The server recomputes the streak only when a log changes (migration 0056), so a
 * run whose last day is before yesterday has lapsed even though the row still
 * says otherwise. streak_day is a date in the household's timezone, so "yesterday"
 * is taken in that zone (device zone if the household has none yet).
 */
export function liveStreak(streak: unknown, streakDay: unknown, timeZone?: string | null, now = Date.now()): number {
  const n = Number(streak) || 0;
  if (n === 0) return 0;
  if (typeof streakDay !== "string") return n; // server predates 0056
  return streakDay.slice(0, 10) >= yesterdayIn(timeZone, now) ? n : 0;
}

// households.timezone of the loaded household (null until known / before 0051).
let householdTz: string | null = null;

function applyHouseholdRow(r: Record<string, unknown>) {
  if (typeof r.timezone === "string" && r.timezone) householdTz = r.timezone;
  householdStore.set((s) => ({
    ...s,
    streak: liveStreak(r.streak, r.streak_day, householdTz),
    units: unitsFromDb(r.units),
  }));
}

const HOUSEHOLD_COLUMNS = "id, name, units, streak, streak_day, timezone";

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

    const [household] = await rows(supabase.from("households").select(HOUSEHOLD_COLUMNS).eq("id", householdId));
    if (!household) throw new Error("household row not readable");
    // Households created before 0051 have no timezone; the first device to load one sets it.
    // householdId is passed because the store does not hold it yet.
    if (!household.timezone) {
      householdTz = deviceTimezone();
      void setTimezone(householdTz, householdId);
    }
    await Promise.all([loadMembers(householdId), loadPets(householdId), loadLogs(householdId), loadNotes(householdId)]);
    await Promise.all([loadWeights(petIds()), loadHealth(petIds())]);
    if (cache.epoch() !== ep) return;

    householdStore.set({ ...INITIAL_HOUSEHOLD, ready: true, householdId });
    applyHouseholdRow(household);
    startRealtime({
      householdId,
      userId,
      onResync: resync,
      onStop: resetResyncState,
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
  resetResyncState();
  householdTz = null;
  cache.reset();
  householdStore.set(INITIAL_HOUSEHOLD);
  const userId = sessionStore.get().userId;
  if (userId) await loadHousehold(userId);
  else householdStore.set({ ...INITIAL_HOUSEHOLD, ready: true });
}

export const reloadHousehold = switchHousehold;
/** Retry after `loadError` (a failed load is not "no household"). */
export const retryHouseholdLoad = switchHousehold;

// Catch-up after a dropped socket or a return to foreground: growing tables
// (logs, weights, notes) fetch only rows past their cursor, the small ones refetch.
let resyncing: Promise<boolean> | null = null;
let lastResyncAt = 0;
const MIN_RESYNC_GAP_MS = 3000;

export function resetResyncState(): void {
  resyncing = null;
  lastResyncAt = 0;
}

/** Resolves false when the catch-up failed (the caller re-arms it). `force` skips the throttle. */
export function resync(full = false, force = false): Promise<boolean> {
  const householdId = householdStore.get().householdId;
  if (!householdId) return Promise.resolve(true);
  if (resyncing) return resyncing;
  if (!full && !force && Date.now() - lastResyncAt < MIN_RESYNC_GAP_MS) return Promise.resolve(true);
  const ep = cache.epoch();
  let run!: Promise<boolean>;
  run = (async () => {
    try {
      const [household] = await rows(supabase.from("households").select(HOUSEHOLD_COLUMNS).eq("id", householdId));
      if (cache.epoch() !== ep) return true;
      if (household) applyHouseholdRow(household);
      // A long gap reloads the whole cached window (picks up back-dated rows and offline deletes).
      await Promise.all([
        loadMembers(householdId),
        loadPets(householdId),
        full ? loadLogs(householdId) : resyncLogs(householdId),
        full ? loadNotes(householdId) : resyncNotes(householdId),
      ]);
      await Promise.all([full ? loadWeights(petIds()) : resyncWeights(petIds()), loadHealth(petIds())]);
      return true;
    } catch (e) {
      if (__DEV__) console.warn("[data] resync failed:", e);
      return false;
    } finally {
      // A reset may have started a newer resync meanwhile; only clear our own.
      if (resyncing === run) {
        lastResyncAt = Date.now();
        resyncing = null;
      }
    }
  })();
  resyncing = run;
  return run;
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

/**
 * households.timezone arrives with a newer migration; a missing column is a no-op.
 * Pass `householdId` when the store does not hold it yet (during the initial load).
 */
export async function setTimezone(tz: string, householdId: string | null = householdStore.get().householdId): Promise<void> {
  if (!householdId) return;
  const { error } = await supabase.from("households").update({ timezone: tz }).eq("id", householdId);
  if (error && error.code !== "42703" && __DEV__) console.warn("[data] timezone update failed:", error.message);
}

let creating: Promise<string> | null = null;

/**
 * Signup creates no household. Onboarding calls this once, then adds the first pet.
 * Refuses while the household load is unfinished or failed (we cannot tell "none" from
 * "couldn't read it", and a second household would be created); concurrent calls share one RPC.
 */
export function createHousehold(name?: string): Promise<string> {
  const existing = householdStore.get().householdId;
  if (existing) return Promise.resolve(existing);
  if (creating) return creating;
  const { ready, loadError } = householdStore.get();
  if (!ready || loadError) {
    const text = "Still loading your family — try again in a moment";
    showError(text);
    return Promise.reject(new MutationError(text));
  }
  const run = doCreateHousehold(name).finally(() => {
    if (creating === run) creating = null;
  });
  creating = run;
  return run;
}

async function doCreateHousehold(name?: string): Promise<string> {
  const userId = sessionStore.get().userId;
  try {
    const { data, error } = await supabase.rpc("create_household", { hname: name?.trim() || "My household" });
    if (error || typeof data !== "string") throw error ?? new Error("create_household returned no id");
    // The RPC sets the active household; repeating it is idempotent and covers read lag.
    if (userId) await supabase.from("user_profiles").upsert({ user_id: userId, active_household_id: data });
    await switchHousehold();
    await setTimezone(deviceTimezone());
    return data;
  } catch (e) {
    if (__DEV__) console.warn("[data] create_household failed:", e);
    showError("Couldn't set up your household. Please try again.");
    throw e;
  }
}
