# PETING. — Handoff

Read this first in a fresh session. Also read `AGENTS.md` (Expo v54 docs rule, Postgres SECURITY DEFINER rules)
and `docs/rebuild/CONTRACT.md` (the `@/data` public API). Repo: `KaguSoftware/PetApp`, working branch `rebuild`.

## What the app is now
A BitePal-style pet-logging app plus a static general care guide (Expo SDK 54, RN 0.81, New Architecture,
React Compiler, expo-router v6 typed routes, TypeScript strict).
- **Home = the mascot**: the user's own pet drawn as a cartoon of its species (dog and cat art, generic fallback for
  other species). It has a **mood** (derived client-side by `lib/mood.ts` from the last 24-48h of logs, per species)
  and says short first-person lines (`lib/petLines.ts`, `lib/reactions.ts`). Tone is warm, never guilt-tripping.
- **Logging**: a big round "+" (center of the custom tab bar) opens a sheet of round tiles. Tapping a tile logs
  instantly with smart defaults, then an Undo toast. Types: fed, water, litter, walk, groomed, meds, vet, plus weight,
  health records (vaccination, vet visit, medication) and free-form notes/symptoms.
- **Streak**: gentle, **server-computed** (migration 0056). The client only reads it (`liveStreak` zeroes a lapsed one).
- **Sharing**: solo by default; invite someone by code/link and they join directly (no roles UI, no approvals).
- **Guide**: static local content in `content/guide/` with SVG illustrations in `components/guide/illustrations/`.
- Screens: `(auth)` welcome/login/signup/forgot, `verify`, `reset-password`, `auth-callback`, `(onboarding)/adopt`,
  `(tabs)` home/history/guide, `pet/[id]`, `pet/new`, `log`, `settings`, `join`, `legal/[doc]`, `dev/mascot` (gallery).

**Removed (do not reintroduce without the owner):** the web demo as a client, coins, cosmetics/dress-up, shop,
premium UI and purchases, vets marketplace, community/forum/chat, reminders and push notifications, care plans,
shortcuts, supplies, pet transfers, family password, multiple households, `lib/store.tsx`, NativeTabs.

## Architecture
- **`data/`** — the only data layer. UI imports from `@/data` (`data/index.ts`), never `data/*` internals.
  One module per resource (`pets`, `logs`, `weights`, `health`, `notes`, `members`, `sharing`, `household`, `session`),
  a keyed row cache (`cache.ts`), `persist.ts`, `realtime.ts`, `toasts.ts`, pure `mappers.ts`. Rules:
  - **Row-level optimistic writes**: insert/update/delete touch one row; failure rolls back only that row (and, for
    updates, only the touched fields) and shows an error toast. `persist.ts` handles both `{error}` and rejections.
  - **Per-id ordering**: ids are client UUIDs; a delete/edit of a row waits for its in-flight insert, so Undo right
    after a log never leaves zombies. Realtime echoes for rows being deleted are ignored.
  - **Realtime**: one channel per household; merged per row by id. DELETE listeners are **unfiltered** (Realtime does
    not apply filters/RLS to DELETE payloads; handle by id). On reconnect/foreground it resyncs (`onResync`).
  - **No schema probes**, legacy fallbacks or retry-on-error-text hacks. The app targets exactly the current schema.
  - Sign-out clears cache, channels, timers and snapshot. `data/client.ts` throws if Supabase env vars are missing.
  - Tests in `data/__tests__` (clear toasts in `afterEach`, otherwise their timers keep jest workers alive).
- **`ui/`** — design system: `tokens.ts`/`theme.tsx` (cream/pastel light, warm cocoa dark, large radii, Bricolage
  Grotesque display + Inter body) and primitives (`Screen`, `Card`, `PillButton`, `RoundTile`, `Sheet`, `TextField`,
  `Chip`, `SpeechBubble`, `Confetti`, `EmptyState`, `ToastHost`, `TabBar`, `PressableScale`, `haptics`, `icons`).
- **`components/mascot/`** — SVG (react-native-svg) + Reanimated mascot; see its README. Respects reduce-motion
  (`lib/a11y.tsx`). Feature components live in `components/{auth,guide,history,home,log,onboarding,pet,settings}`.
- **`lib/`** — auth (`auth.ts`, `authErrors.ts`), `mood`, `petLines`, `reactions`, `format`, `legal`, `brand`,
  `pendingInvite`, `runtimeEnv`, `supabase`.

## Backend (Supabase project `mpsyprtnejjbnhyaiidn`)
- The web demo is **retired**; this app is the only client. Migrations are forward-only: never edit an applied file.
- Migrations through **0058 are applied** to the live project. 0044-0049 were applied by hand in the SQL editor and the
  migration history was repaired afterwards. (The one-off verify scripts for those were deleted.)
- What the recent ones enforce:
  - **0051** households are server-owned; clients may UPDATE only `name`, `units`, `timezone`; no direct INSERT/DELETE
    (go through `create_household` / `delete_household`). Dropped the broken `households_single_owned_guard`.
  - **0052** invites are the only way in: dropped `join_household(uuid)`, family-password RPCs and columns.
  - **0053** `redeem_invite` returns a status (so failed attempts commit and the limiter really counts), advisory lock
    per (user, kind), invite row `FOR UPDATE`, direct join; no client writes to `household_members`; `guard_member_write`
    authorizes against OLD household; one owner per household; `anon` loses EXECUTE on public RPCs.
  - **0054** pets defaults + any species; activities attribution (`user_id`/`member_id`) set by trigger from the
    caller's membership, pet must belong to the household; indexes.
  - **0055** `pet_notes` table (note/symptom, RLS by household, server-owned attribution, realtime).
  - **0056** server streak in `households.timezone`; a day counts if recorded within 7 days (`activities.created_at`);
    rejects future `ts`.
  - **0057** retired features: clients lose all privileges on forum/chat/reminders/care_schedules/shortcuts/supplies/
    booked_vets/etc., removed from realtime, their RPCs dropped. **Tables and rows still exist** (non-destructive).
  - **0058** advisor fixes: trigger functions not executable by clients; `auth.uid()` wrapped in `(select ...)` in
    live-table policies.
- **Dry-run a migration** (nothing persists): build a file `begin; <migration>; <supabase/tests/security_probes.sql>; rollback;`
  and run `npx supabase db query --linked -f that.sql` (see the header of `security_probes.sql`; for already-applied
  migrations run just `begin; <probes>; rollback;`). Every probe row must read `blocked ...` or `ok`; any `!!` is a failure.
- New SECURITY DEFINER functions: follow AGENTS.md (`set search_path = public[, extensions]`; never treat
  `auth.uid() is null` as trusted; client-vs-server checks use `current_user` in a SECURITY INVOKER trigger).
- Edge functions: `delete-account` (live feature), `rc-webhook` (dormant; premium is service-role only if it returns).
  `supabase/config.toml` pins `verify_jwt` per function. `supabase/RESET_ALL_ACCOUNTS.sql` is a destructive dev wipe
  of every account/household (run only by deliberate paste into the SQL editor).
- `supabase/diagnostics/schema_snapshot.sql` dumps the live schema for auditing.

## Conventions
- Read https://docs.expo.dev/versions/v54.0.0/ before touching any Expo API (AGENTS.md).
- Colors/spacing/radii/fonts only from `ui/tokens`; press feedback via `PressableScale` (no bare opacity presses);
  44pt touch targets; haptics via `ui/haptics`. Brand strings in `lib/brand.ts`.
- No `console.log` (production babel strips all but `console.error`). No dead code, no new deps without a reason.
- Commit as the owner, Parsa; push only when asked. Owner confirms destructive SQL (revokes, drops) separately.

## Run / test
- `npm start` (Expo Go; tunnel if LAN blocked). `.env` (gitignored): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- `npx jest` (data, lib, and screen tests), `npx tsc --noEmit`, `npm run lint`,
  `npx expo export --platform android` (and `ios`) to confirm bundles, `npx expo-doctor` (18/18 at last run).
- EAS: `eas.json` has development/preview/production channels; `expo-updates` is configured in `app.json`.
- Gotcha: if typed routes reject valid paths, delete `%LOCALAPPDATA%/Temp/metro-*` and start Expo once.

## Not yet verified / open items
- **Never run on a physical device.** Only tsc, jest, lint, export and SQL probes have been run. The full end-to-end
  walkthrough (sign up, adopt, log every type, undo, invite a second account, realtime) is still to do.
- **Mascot art is awaiting owner review** (dog and cat; other species use the fallback).
- **Retired tables still hold data.** 0057 only revoked access; dropping them (destructive) awaits owner confirmation.
- **Leaked-password protection** is a dashboard toggle (Auth -> Settings), not SQL; not yet enabled.
- `delete-account` Edge Function: hardened version (no raw Postgres errors returned) deployed 2026-10-15; verified it returns 401 without a user JWT.
- `rc-webhook` is dormant and not hardened (timing-safe secret, environment check, event ordering) for when premium returns.
- Push notifications and reminders were removed; nothing replaces them.
- Baseline schema 0001-0014 lives in the retired web repo and is not committed here (see `schema_snapshot.sql`).
