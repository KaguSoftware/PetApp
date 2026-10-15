# Rebuild contract (shared between the data-layer and UI agents)

Plan: `C:\Users\p.mansouri\.claude\plans\hello-claude-how-are-elegant-stonebraker.md`.
This file pins the seams so both tracks can be built in parallel. Change it only via the reviewer (Opus).

## Ownership
| Track | Owns (may create/edit/delete) | Must not touch |
|---|---|---|
| Data | `data/**`, `lib/store.tsx` (delete at end), `lib/supabase.ts`, `providers/session.tsx`, `lib/pendingInvite.ts`, `lib/inviteShare.ts`, `lib/memberCard.ts`, `lib/chat.ts`, `lib/moderation.ts`, `lib/pushTokens.ts`, `lib/notifications.ts`, `lib/careStatus.ts`, `lib/careDashboard.ts`, `lib/carePlan.ts`, `lib/inbox.ts`, `lib/home.ts`, `lib/wardrobe.ts` | `app/**`, `components/**`, `ui/**` |
| UI | `app/**`, `components/**`, `ui/**`, `lib/theme.ts`, `lib/a11y.tsx`, `lib/brand.ts`, `assets/**`, `app.json` fonts | `data/**`, `supabase/**` |

`lib/auth.ts`, `lib/authErrors.ts`, `lib/legal.ts`, `lib/guides.tsx`, `lib/nutrition.ts`, `lib/data.ts`: read-only for both tracks for now.

## Public API of `@/data` (UI imports ONLY from `@/data`, never from `data/*` internals)

```ts
// Providers
export function DataProvider(props: { children: React.ReactNode }): JSX.Element;
// Wraps SessionProvider-equivalent state. Mount once in app/_layout.tsx inside SafeAreaProvider.

// Session
export function useSession(): {
  ready: boolean;            // persisted session read
  session: Session | null;
  userId: string | null;
};
export function useHousehold(): {
  ready: boolean;            // household + members + pets loaded (or known empty)
  householdId: string | null;
  myMemberId: string | null;
  myRole: "owner" | "admin" | "member" | null;
  streak: number;            // read-only, server-computed
  units: "metric" | "imperial";
};

// Pets
export type Species = "dog" | "cat" | "rabbit" | "bird" | "fish" | "reptile" | "hamster" | "other"; // align with existing SpeciesField values
export interface Pet { id: string; name: string; species: Species; breed: string | null; birthDate: string | null /* yyyy-mm-dd */; gender: "male" | "female" | null; weightKg: number | null; notes: string | null; }
export function usePets(): Pet[];
export function usePet(id: string): Pet | undefined;
export function addPet(input: Omit<Pet, "id">): Promise<Pet>;
export function editPet(id: string, patch: Partial<Omit<Pet, "id">>): Promise<void>;
export function deletePet(id: string): Promise<void>;

// Logs (activities)
export type CareType = "fed" | "water" | "litter" | "walk" | "groomed" | "meds" | "vet";
export interface CareLog { id: string; petId: string; memberId: string | null; type: CareType; ts: number /* epoch ms */; note: string | null; grams: number | null; medId: string | null; durationMinutes: number | null; }
export function useLogs(opts?: { petId?: string; sinceMs?: number }): CareLog[]; // newest first
export function logCare(petId: string, type: CareType, extra?: { id?: string; grams?: number; medId?: string; durationMinutes?: number; note?: string; ts?: number }): Promise<CareLog>; // optimistic; resolves after server ack; rejects on failure (row already rolled back + toast shown)
export function editLog(id: string, patch: Partial<Pick<CareLog, "note" | "grams" | "durationMinutes" | "ts">>): Promise<void>;
export function deleteLog(id: string): Promise<void>; // safe to call immediately after logCare (waits for insert)

// Weight
export interface WeightEntry { id: string; petId: string; kg: number; ts: number; }
export function useWeights(petId: string): WeightEntry[];
export function addWeight(petId: string, kg: number, ts?: number): Promise<WeightEntry>;
export function deleteWeight(id: string): Promise<void>;

// Health
export interface Vaccination { id: string; petId: string; name: string; date: string; nextDue: string | null; }
export interface VetVisit { id: string; petId: string; date: string; reason: string; notes: string | null; }
export interface Med { id: string; petId: string; name: string; dose: string | null; schedule: string | null; active: boolean; }
export function useVaccinations(petId: string): Vaccination[];
export function useVetVisits(petId: string): VetVisit[];
export function useMeds(petId?: string): Med[];
export function addVaccination(v: Omit<Vaccination, "id">): Promise<Vaccination>;
export function addVetVisit(v: Omit<VetVisit, "id">): Promise<VetVisit>;
export function addMed(m: Omit<Med, "id">): Promise<Med>;
export function editMed(id: string, patch: Partial<Omit<Med, "id" | "petId">>): Promise<void>;
export function deleteVaccination(id: string): Promise<void>;
export function deleteVetVisit(id: string): Promise<void>;
export function deleteMed(id: string): Promise<void>;

// Notes (new pet_notes table, migration from 0051+)
export interface PetNote { id: string; petId: string; memberId: string | null; kind: "note" | "symptom"; body: string; ts: number; }
export function useNotes(petId?: string): PetNote[];
export function addNote(petId: string, kind: PetNote["kind"], body: string, ts?: number): Promise<PetNote>;
export function deleteNote(id: string): Promise<void>;

// Sharing
export interface Member { id: string; name: string; emoji: string | null; userId: string | null; role: "owner" | "admin" | "member" | null; isMe: boolean; }
export function useMembers(): Member[];
export function createInvite(): Promise<{ code: string; expiresAt: number }>;
export function redeemInvite(code: string): Promise<{ ok: true } | { ok: false; reason: "not_found" | "expired" | "already_member" | "rate_limited" }>;
export function removeMember(memberId: string): Promise<void>;
export function leaveHousehold(): Promise<void>;
export function setUnits(u: "metric" | "imperial"): Promise<void>;
// Signup does NOT create a household (migration 0029). Onboarding calls this once
// (via the existing create_household RPC from 0028/0044) when useHousehold().householdId is null,
// then the user adds their first pet. Also sends the device timezone (Intl) once — see setTimezone.
export function createHousehold(name?: string): Promise<string /* householdId */>;
export function setTimezone(tz: string): Promise<void>; // households.timezone (column added by migration 0051+); no-op on 42703


// Toasts (data layer raises errors through this; UI renders them)
export interface Toast { id: string; kind: "info" | "error" | "undo"; text: string; actionLabel?: string; onAction?: () => void; }
export function useToasts(): Toast[];
export function showToast(t: Omit<Toast, "id">): string;
export function dismissToast(id: string): void;

// Auth (re-export of lib/auth.ts flows, unchanged signatures)
export * from "@/lib/auth";
export function signOut(): Promise<void>; // clears cache, channels, timers, snapshot
```

## Rules for both tracks
- Expo SDK 54: check https://docs.expo.dev/versions/v54.0.0/ for any Expo API you touch.
- TypeScript strict, path alias `@/`. `npx tsc --noEmit` and `npm run lint` must pass for files you own before reporting.
- No `console.log` left in. No dead code.
- No new dependencies without listing them in your report.
