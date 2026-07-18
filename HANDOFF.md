# PetPal Mobile — Handoff

> Read this first when starting a fresh chat. The web demo (feature reference, still live) is
> `KaguSoftware/myPet-webdemo`. This repo: `https://github.com/KaguSoftware/PetApp`, branch `main`.

## Working style
- **Collaborate**: the owner (Parsa) confirms direction before significant/user-facing decisions.
- **Git**: commit as **Parsa only — never add Co-Authored-By trailers**. Push only when the owner asks.
- **UI quality bar**: native iOS feel — 44pt targets, safe areas, sheets, 150–250ms ease-out motion. No emoji in UI chrome; pixel art only for pets/cosmetics/coin. Colors/fonts only from `lib/theme.ts`.
- **Port, don't reinvent**: shared-backend logic is copied from the web demo so both clients behave identically.

## What this is
Native rebuild of **PetPal** (family pet-care app: care logging, reminders, health records, pixel-art dress-up with coins/streaks/cosmetics, vet marketplace, PetPal+ premium). Shares the web demo's Supabase backend — same accounts, same data, live in both clients.

## Stack & environment
- Expo SDK 54 (RN 0.81, New Architecture, React Compiler on), TypeScript strict, Expo Router v6 typed routes.
- Supabase project `mpsyprtnejjbnhyaiidn` (shared with web). `.env` (gitignored): `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Schema = web migrations 0001–0014 (no 0008) + this repo's `supabase/migrations/0015_push_tokens.sql` (**not yet applied** — needed only for remote push). Additive migrations only, service-role key never in this repo.
- Dev: Windows 11 → **Expo Go on iPhone** (`npx expo start`, tunnel mode if LAN blocked). RevenueCat + remote push live behind abstractions until the EAS cutover (below).

## Current status (2026-07-18 — ALL PHASES BUILT; on-device verification pending)
Every phase (1–6) is implemented, committed, and statically verified: `tsc --noEmit` clean, `expo lint` clean, iOS Metro bundle compiles (5.4 MB), expo-doctor 18/18. **Not yet exercised on a device** — the owner's next step is a full walkthrough in Expo Go (log care, reminders + local notification firing, dress-up/shop, pet detail health records, family invite, paywall mock purchase, cross-check writes against the web demo).

What exists:
- **Phase 1** auth (login/signup/confirm), session persistence, full store port (`lib/store.tsx`, ~2,200 lines: optimistic writes, rollback, 5s undo, care alerts, streak/coin debounce).
- **Phase 2** design system (`lib/theme.ts` = exact oklch→sRGB web palette), ui primitives, modal Sheet, TabScreen/PushedScreen scaffolds (large-title → condensed blur), floating **island tab bar**, pixel sprite engine (run-length merged SVG), GeistPixel + Inter fonts.
- **Phase 3** Logs tab (action grid, portion picker, retro logging, vet-visit sheet, +5 coin pop, haptics), Pets tab (arcade stage, Pet3D drag-tilt, cosmetics shop, add-a-pet), StreakCalendarSheet.
- **Phase 4** Reminders agenda (repeats, roll-forward, stepper date/time pickers), Activity hub (deduped alerts, premium insights, day-grouped feed), local notifications (`lib/notifications.ts` cancel-all+resync ≤60, `NotificationSync` in root layout, tap → /reminders).
- **Phase 5** Pet detail (identity/weight chart/supplies/meds/vaccinations/vet visits/delete), emergency card with native Share, Care Plan tab (checklist, breed guides, custom plans, premium gate), Home (swipeable hero, meals bar, attention banner), Welcome, settings hub + family/account/general/accessibility, vets marketplace, join landing.
- **Phase 6** `PurchasesGateway` + mock (`providers/purchases/`), Paywall through the gateway, migration 0015, Edge Functions (`delete-account`, `send-due-reminders`, `rc-webhook`), `lib/pushTokens.ts`.

## File map
- `lib/store.tsx` — THE app state (ported web store). Stable; don't modify for UI work. `lib/data.ts` — types + reference data (verbatim web copy). `lib/theme.ts` — all tokens.
- `components/` — ui.tsx primitives, Screen.tsx scaffolds, Sheet, IslandTabBar, Icons, Paywall, Toasts, NotificationSync, per-feature sheets; `components/pixel/` — sprite engine + data + Pet3D + PixelChart.
- `app/` — (auth) login/signup; (tabs) index/plan/logs/pets/settings; pushed: activity, reminders, pet/[id](+card), vets, join, settings/{family,account,general,accessibility}.
- `providers/` — session, purchases. `lib/notifications.ts`, `lib/pushTokens.ts`, `lib/a11y.tsx`.
- `supabase/migrations/0015_push_tokens.sql`, `supabase/functions/{delete-account,send-due-reminders,rc-webhook}` (Deno; excluded from app tsconfig/eslint).

## Roadmap
1. **← ACTIVE: owner verifies the full app in Expo Go on iPhone** (walkthrough above; reload between checks to confirm DB persistence).
2. Fix whatever the walkthrough surfaces; visual polish pass on-device.
3. EAS cutover (checklist below), TestFlight, App Store.

## EAS cutover checklist (when the app is ready for real builds)
1. `npm i -g eas-cli && eas login && eas init` (sets `extra.eas.projectId` — unlocks push token registration in `lib/pushTokens.ts`).
2. Apply `supabase/migrations/0015_push_tokens.sql` to the shared project (`supabase migration list` first; verify web demo after).
3. Deploy Edge Functions: `supabase functions deploy delete-account send-due-reminders rc-webhook`; set `CRON_SECRET`, `RC_WEBHOOK_SECRET`; schedule `send-due-reminders` via pg_cron (SQL in the function header). Point `app/settings/account.tsx` deletion at `delete-account` (SCOPE(P6) comment marks the spot).
4. Call `registerPushToken(userId)` after sign-in (root layout) — code exists, just not invoked.
5. RevenueCat: create app + `petpal_plus_monthly` product, `npx expo install react-native-purchases`, add `providers/purchases/revenuecat.ts` adapter (select it in `providers/purchases/index.tsx` when `Constants.appOwnership !== "expo"` && `EXPO_PUBLIC_RC_API_KEY` set — file must not exist before this step or Metro bundles it into Expo Go), configure with Supabase user id as app_user_id, wire the dashboard webhook → `rc-webhook`.
6. Supabase Auth: add `petpal://` redirect URLs for email confirm on device.
7. `eas build --profile development --platform ios` (Apple Developer account required) → dev-build walkthrough → `preview`/`production` builds → TestFlight.

## Deliberately partial — grows later
| Area | What shipped now | Intended full shape | Grows in |
| --- | --- | --- | --- |
| Purchases | Mock gateway, instant unlock via `households.premium` | RevenueCat adapter + webhook | EAS cutover |
| Notifications | Local scheduling only | Remote push via 0015 + Edge Function | EAS cutover |
| Account deletion | Toast stub (`SCOPE(P6)` in account.tsx) | `delete-account` Edge Function call | EAS cutover step 3 |
| Date/time inputs | Chip/stepper pickers (no native dep) | Consider native datetimepicker in dev build | Post-verify polish |
| A11y prefs | Stored via `lib/a11y.tsx`, not yet consumed | Reduce-motion gating on reanimated effects | Polish |
| Invite web origin | Placeholder `https://petpal.app` in family.tsx | Real deployed web-demo origin | One-line fix (owner: provide URL) |
| Emergency card | Text share only | Print/PDF variant (needs expo-print) | Optional |

## Gotchas
- **Web demo is production truth**: never rename/drop/retighten schema it queries; new migrations start at 0015 (no 0008 upstream).
- Expo Go: never install `react-native-purchases` before the cutover step; typed-route regeneration only happens on `expo start`/`export` — if a new route 404s in types, boot the dev server once.
- Store hydration falls back to a legacy select when health migrations are missing — keep that path intact.
- React Compiler is ON; if odd behavior appears on device, try flipping it off in app.json first.
- Windows: LF→CRLF warnings are harmless.

## Running it
```
npx expo start            # QR → Expo Go on iPhone (same Wi-Fi; --tunnel if blocked)
npx tsc --noEmit          # must stay clean
npm run lint              # must stay clean
npx expo export --platform ios --output-dir <scratch>   # bundle sanity check
```
