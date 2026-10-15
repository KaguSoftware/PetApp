/* In-memory stand-in for the `@/data` barrel. Pick a scenario with setScenario() before rendering. */
import type { CareLog, Med, Member, Pet, PetNote, Toast, Vaccination, VetVisit, WeightEntry } from "@/data";

export type ScenarioName = "signedOut" | "noHousehold" | "loadError" | "full" | "noPets";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export interface Scenario {
  session: { ready: boolean; session: object | null; userId: string | null };
  household: { ready: boolean; householdId: string | null; streak: number; units: "metric" | "imperial"; loadError: string | null };
  pets: Pet[];
  logs: CareLog[];
  weights: WeightEntry[];
  vaccinations: Vaccination[];
  vetVisits: VetVisit[];
  meds: Med[];
  notes: PetNote[];
  members: Member[];
  toasts: Toast[];
}

export const DOG: Pet = { id: "dog-1", name: "Rex", species: "dog", breed: "Beagle", birthDate: "2020-03-04", gender: "male", weightKg: 12, notes: null };
export const CAT: Pet = { id: "cat-1", name: "Mia", species: "cat", breed: null, birthDate: "2021-06-01", gender: "female", weightKg: 4.2, notes: "Shy" };

const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function build(name: ScenarioName): Scenario {
  const now = Date.now();
  const log = (id: string, petId: string, type: CareLog["type"], ago: number, extra: Partial<CareLog> = {}): CareLog => ({
    id, petId, memberId: "m1", type, ts: now - ago, note: null, grams: null, medId: null, durationMinutes: null, ...extra,
  });
  const empty: Scenario = {
    session: { ready: true, session: null, userId: null },
    household: { ready: true, householdId: null, streak: 0, units: "metric", loadError: null },
    pets: [], logs: [], weights: [], vaccinations: [], vetVisits: [], meds: [], notes: [], members: [], toasts: [],
  };
  const signedIn = { ready: true, session: { user: { id: "u1", email: "me@example.com" } }, userId: "u1" };
  switch (name) {
    case "signedOut":
      return empty;
    case "noHousehold":
      return { ...empty, session: signedIn };
    case "loadError":
      return { ...empty, session: signedIn, household: { ...empty.household, loadError: "Network request failed" } };
    case "noPets":
      return {
        ...empty,
        session: signedIn,
        household: { ready: true, householdId: "h1", streak: 0, units: "metric", loadError: null },
        members: [{ id: "m1", name: "Parsa", emoji: "🐶", userId: "u1", role: "owner", isMe: true }],
      };
    case "full":
      return {
        session: signedIn,
        household: { ready: true, householdId: "h1", streak: 3, units: "metric", loadError: null },
        pets: [DOG, CAT],
        logs: [
          log("l1", DOG.id, "fed", 1 * HOUR),
          log("l2", DOG.id, "walk", 2 * HOUR, { durationMinutes: 30 }),
          log("l3", CAT.id, "litter", 3 * HOUR),
          log("l4", DOG.id, "water", 1 * DAY + HOUR),
          log("l5", CAT.id, "fed", 1 * DAY + 2 * HOUR, { grams: 60 }),
        ].sort((a, b) => b.ts - a.ts),
        weights: [
          { id: "w1", petId: DOG.id, kg: 11.6, ts: now - 30 * DAY },
          { id: "w2", petId: DOG.id, kg: 11.9, ts: now - 14 * DAY },
          { id: "w3", petId: DOG.id, kg: 12, ts: now - 2 * DAY },
          { id: "w4", petId: CAT.id, kg: 4.2, ts: now - 5 * DAY },
        ],
        vaccinations: [
          { id: "v1", petId: DOG.id, name: "Rabies", date: ymd(now - 200 * DAY), nextDue: ymd(now + 165 * DAY) },
          { id: "v2", petId: CAT.id, name: "FVRCP", date: ymd(now - 100 * DAY), nextDue: null },
        ],
        vetVisits: [{ id: "vv1", petId: DOG.id, date: ymd(now - 40 * DAY), reason: "Checkup", notes: "All good", vetName: "Dr. Lee" }],
        meds: [{ id: "med1", petId: DOG.id, name: "Apoquel", dose: "5 mg", schedule: "daily", active: true }],
        notes: [
          { id: "n1", petId: DOG.id, memberId: "m1", kind: "note", body: "Loves the park", ts: now - 4 * HOUR },
          { id: "n2", petId: CAT.id, memberId: "m2", kind: "symptom", body: "Sneezing", ts: now - 26 * HOUR },
        ],
        members: [
          { id: "m1", name: "Parsa", emoji: "🐶", userId: "u1", role: "owner", isMe: true },
          { id: "m2", name: "Sam", emoji: "🐱", userId: "u2", role: "member", isMe: false },
        ],
        toasts: [],
      };
  }
}

let current: Scenario = build("full");
export function setScenario(name: ScenarioName | ((s: Scenario) => Scenario)): void {
  current = typeof name === "function" ? name(current) : build(name);
}

/** Restrict the full household to these pets (e.g. cat only). */
export function onlyPets(...pets: Pet[]): void {
  setScenario((s) => ({ ...s, pets, logs: s.logs.filter((l) => pets.some((p) => p.id === l.petId)) }));
}

const ok = <T>(v: T) => jest.fn(async (..._a: unknown[]) => v);

export const fns = {
  logCare: jest.fn(async (..._a: unknown[]) => ({ id: "new-log" })),
  deleteLog: ok(undefined),
  editLog: ok(undefined),
  addWeight: jest.fn(async (..._a: unknown[]) => ({ id: "nw" })),
  deleteWeight: ok(undefined),
  addPet: jest.fn(async (input: Record<string, unknown>) => ({ id: "new-pet", ...input })),
  editPet: ok(undefined),
  deletePet: ok(undefined),
  addMed: ok(undefined),
  addVaccination: ok(undefined),
  addVetVisit: ok(undefined),
  deleteMed: ok(undefined),
  editMed: ok(undefined),
  deleteVaccination: ok(undefined),
  deleteVetVisit: ok(undefined),
  addNote: ok(undefined),
  deleteNote: ok(undefined),
  showToast: jest.fn((_t: unknown) => "toast-id"),
  dismissToast: jest.fn(),
  signOut: ok(undefined),
  createHousehold: ok("h1"),
  reloadHousehold: ok(undefined),
  retryHouseholdLoad: ok(undefined),
  setTimezone: ok(undefined),
  setUnits: ok(undefined),
  createInvite: ok({ code: "ABCD-2345", expiresAt: Date.now() + 86_400_000 }),
  redeemInvite: ok({ ok: true }),
  removeMember: ok(undefined),
  leaveHousehold: ok(undefined),
  shareInvite: ok(undefined),
  copyInviteCode: ok(undefined),
};

export function resetFns(): void {
  for (const f of Object.values(fns)) (f as jest.Mock).mockClear();
}

// Hook results are memoised per scenario object so React never sees a fresh reference each render.
const memo = new WeakMap<Scenario, Record<string, unknown>>();
function cached<T>(key: string, make: (s: Scenario) => T): T {
  let m = memo.get(current);
  if (!m) memo.set(current, (m = {}));
  if (!(key in m)) m[key] = make(current);
  return m[key] as T;
}

export const fakeDataModule = {
  __esModule: true,
  DataProvider: ({ children }: { children?: unknown }) => children,
  useSession: () => current.session,
  useHousehold: () =>
    cached("household", (s) => {
      const me = s.members.find((m) => m.isMe);
      return { ...s.household, myMemberId: me?.id ?? null, myRole: me?.role ?? null };
    }),
  liveStreak: (streak: number) => streak,
  usePets: () => current.pets,
  usePet: (id: string) => cached("pet:" + id, (s) => s.pets.find((p) => p.id === id)),
  useLogs: (opts?: { petId?: string; sinceMs?: number }) =>
    cached("logs:" + (opts?.petId ?? "") + ":" + (opts?.sinceMs ?? ""), (s) =>
      s.logs.filter((l) => (!opts?.petId || l.petId === opts.petId) && (!opts?.sinceMs || l.ts >= opts.sinceMs)),
    ),
  useWeights: (petId: string) => cached("w:" + petId, (s) => s.weights.filter((w) => w.petId === petId).sort((a, b) => a.ts - b.ts)),
  useVaccinations: (petId: string) => cached("v:" + petId, (s) => s.vaccinations.filter((v) => v.petId === petId)),
  useVetVisits: (petId: string) => cached("vv:" + petId, (s) => s.vetVisits.filter((v) => v.petId === petId)),
  useMeds: (petId?: string) => cached("m:" + (petId ?? ""), (s) => s.meds.filter((m) => !petId || m.petId === petId)),
  useNotes: (petId?: string) => cached("n:" + (petId ?? ""), (s) => s.notes.filter((n) => !petId || n.petId === petId)),
  useMembers: () => current.members,
  useToasts: () => current.toasts,
  parseTimestamptz: (v: string) => Date.parse(v),
  ...fns,
};
