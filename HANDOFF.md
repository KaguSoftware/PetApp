# PetPal Mobile — Handoff

> Read this first when starting a fresh chat. Companion: the approved plan at
> `~/.claude/plans/hello-claude-i-wanna-jazzy-quiche.md`; the web demo (feature
> reference) is `KaguSoftware/myPet-webdemo`, cloned locally for porting when needed.

## Working style
- **Collaborate**: the owner (Parsa) confirms direction before significant/user-facing decisions; plan mode for non-trivial work; owner approves each phase before the next begins.
- **Git**: commit as **Parsa only — never add Co-Authored-By trailers**. Remote is `https://github.com/KaguSoftware/PetApp.git`, branch `main`. Push only when the owner asks.
- **UI quality bar**: real-app native quality (positioning, touch targets, styling) — use the `impeccable` skill for every UI phase (2–6). No emoji in UI chrome; pixel art only for pets/cosmetics.
- **Port, don't reinvent**: shared-backend logic must be copied from the web demo (`lib/store.tsx`, `lib/data.ts`) so both clients behave identically.
- Keep this file current at the end of every phase.

## What this is
Native rebuild of **PetPal**, a family pet-care app (care logging, reminders, health records, pixel-art pet dress-up with coins/streaks/cosmetics, vet marketplace, PetPal+ premium). The existing Next.js web demo stays live; this app shares its Supabase backend so accounts/pets/data work in both. Goal: full feature parity, then EAS builds → App Store.

## Stack & environment
- **Expo SDK 54** (RN 0.81, New Architecture, React Compiler experiment on), TypeScript strict, Expo Router v6, typed routes.
- **Supabase** shared project `mpsyprtnejjbnhyaiidn` (same as web demo). Creds in `.env` (gitignored) as `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Schema = web demo migrations 0001–0014 (no 0008). **Additive migrations only, numbered 0015+.** Service-role key must never enter this repo.
- Dev: Windows 11; testing in **Expo Go on iPhone** (`npx expo start`, scan QR). RevenueCat + remote push are deferred to a final EAS phase; they must stay behind mockable interfaces until then.
- Key deps installed: @supabase/supabase-js, async-storage, url-polyfill, react-native-svg, expo-notifications, expo-blur, expo-crypto, expo-device, @gorhom/bottom-sheet, reanimated, gesture-handler, @expo-google-fonts/inter.

## Conventions
- Colors come from `lib/theme.ts` (web's oklch(285) accent pre-converted to sRGB) — never hardcode in screens.
- Icons: `components/Icons.tsx` — 24×24 stroke SVGs ported 1:1 from web; `currentColor` resolves via the `color` prop on `<Svg>`.
- Toast API mirrors the web: `toast(icon, title, body?, action?)`; icon name derives tile tone (alert/trash red, check/star/flame green, else accent).
- Store: single React context (`lib/store.tsx`) with optimistic writes + rollback, ~5s undoable deletes, debounced coin/streak writes, per-recipient notification dedup. No react-query/zustand.
- Path alias `@/*` from repo root.

## Current status (2026-07-18 — Phase 1 built, on-device verification pending)
Done and verified statically (tsc clean, eslint clean, expo-doctor 18/18, iOS Metro export bundles, Supabase REST reachable with the anon key):
- Scaffold, git repo on `main` with origin set (not yet pushed).
- `lib/supabase.ts` (AsyncStorage sessions, AppState-driven token refresh).
- **Full web store ported** (`lib/store.tsx`, all 40+ actions incl. Phase 3–5 features like logAction, cosmetics, vaccinations). Native adaptations: expo-crypto for randomUUID/SHA-256, module-level supabase client, `reloadNonce` state instead of `window.location.reload()`, signOut relies on layout redirect. `lib/data.ts` + `lib/authErrors.ts` copied verbatim.
- Auth screens (login/signup with confirm-email fallback), session gating via `providers/session.tsx` + group-layout Redirects.
- Tab shell (Home/Care/Logs/Pets/Settings); Home renders hydrated pets/coins/streak/members; Settings has sign-out; toast overlay in root layout.
- **NOT yet tested on a device.** Next action: owner runs `npx expo start`, opens in Expo Go on iPhone, signs in with a web-demo account, confirms pets/members hydrate and session survives an app restart.

## File map
- `app/_layout.tsx` — fonts (Inter), SessionProvider → StoreProvider, root Stack, toast overlay.
- `providers/session.tsx` — auth session state driving (auth) vs (tabs) redirects.
- `app/(auth)/login.tsx`, `signup.tsx` — email/password auth.
- `app/(tabs)/` — 5 tabs; `index.tsx` is the Phase-1 hydration proof; plan/logs/pets are placeholders.
- `lib/store.tsx` — THE app state (2,200 lines, ported from web). Treat as stable; UI work shouldn't modify it.
- `lib/data.ts` — types, cosmetics catalog, breed plans, vet marketplace, pure helpers (verbatim web copy).
- `components/Icons.tsx` — stroke icon set + ACTION_ICON map. `components/Toasts.tsx`, `components/auth-ui.tsx`.
- `lib/theme.ts` — color/radius tokens (Phase 2 expands). `eas.json` — build profiles (unused until EAS phase).

## Roadmap
1. **Phase 1 — boot/auth/hydration: built; ← ACTIVE (awaiting owner's on-device verify)**
2. Phase 2 — design system, nav shell polish, pixel sprite engine (react-native-svg), Pets tab read-only. (impeccable skill)
3. Phase 3 — care logging UI + gamification (coin pop, streak sheet, shop).
4. Phase 4 — reminders v2 UI + notification hub + local notifications (`expo-notifications`).
5. Phase 5 — health records, care plans, vets, family/join deep link, settings subpages, delete-account Edge Function.
6. Phase 6 — PetPal+ paywall (mock purchases persisted server-side), migrations `0015_push_tokens` + `0016_entitlements`, EAS cutover checklist.

## Deliberately partial — grows later
| Area | What shipped now | Intended full shape | Grows in |
| --- | --- | --- | --- |
| Care/Logs/Pets tabs | "arrives in Phase N" placeholders | Full checklist / log grid / dress-up stage | P2–P5 |
| Home | Plain hydration proof (stats + pet list) | Glance hero, attention banner, next-up reminder | P2 |
| Theme/auth UI | Minimal tokens + basic forms (`auth-ui.tsx`) | Full design system, BrandMark, pixel cat on auth | P2 |
| Purchases | Nothing (web's fake unlock still reachable via store `setPremium`) | PurchasesGateway + mock → RevenueCat | P6 |
| Notifications | In-app toasts only | Local scheduling (P4) → Expo Push via Edge Function (EAS phase) | P4/P6 |
| Email confirm links | Land on the web demo | `petpal://` deep-link confirm | EAS phase |

## Gotchas
- **The web demo is production truth.** Never rename/drop/retighten schema it queries. Web repo skips migration 0008; check `supabase migration list` before pushing new ones.
- Expo Go can't load `react-native-purchases` — don't install it until the EAS phase (Metro would bundle it).
- Store hydration falls back to a legacy select if health migrations are missing (`legacySchemaRef`) — keep that path intact.
- `.env` is gitignored; recreate from `.env.example` + Supabase dashboard on a new machine.
- React Compiler experiment is ON (scaffold default); if odd store behavior appears on device, try disabling it in `app.json` first.
- Windows line endings: repo warns LF→CRLF; harmless, don't "fix" en masse.

## Running it
```
npx expo start          # scan QR with iPhone camera → opens in Expo Go
npx tsc --noEmit        # typecheck (must stay clean)
npm run lint            # eslint (must stay clean)
npx expo-doctor         # project health
```
