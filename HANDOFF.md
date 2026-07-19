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

## UI system (2026-07-18 native-feel pass — THE way to build UI here)
- **Navigation is real system chrome**: tabs are nested native stacks (`app/(tabs)/<tab>/{_layout,index}.tsx`) with UIKit large titles collapsing into a blurred bar (`tabStackScreenOptions` in components/Screen.tsx); pushed screens use the root Stack's native header (back chevron, edge-swipe). Never hand-roll headers/back bars. `TabScreen`/`PushedScreen` wire titles + `trailing`→headerRight and provide the scroll scaffold.
- **Press feedback**: `PressableScale` (ui.tsx) for cards/buttons/chips (optional `haptic`); shared `Row`'s fill highlight for list rows. Bare `pressed && {opacity}` styles are banned. Touch targets ≥44pt effective.
- **Primitives** (ui.tsx, single source of truth — no local copies): SheetTitle, SheetSubtitle, FieldLabel, TextField (forwardRef, accent focus ring), SheetFooter, Footnote, SelectableChip, Toggle, SmallButton, AccentButton (`loading` spinner = the async pattern), EditStatSheet/EditTextSheet for stat/text edits.
- **Colors/fonts**: theme tokens only; derive tints with `withAlpha(colors.x, a)`. Tab bar is the REAL system UITabBar (expo-router NativeTabs, SF Symbols) — never rebuild it. Press feedback is the standard iOS dim-while-held (PressableScale).
- **Gotcha**: if typed routes error on valid paths (`/home`), the Metro file-map cache is stale — delete `%LOCALAPPDATA%/Temp/metro-*` and boot `expo start` once.

## Current status (2026-07-19 — ALL PHASES BUILT + native-feel pass + bug-fix rounds 1–5 done; on-device verification pending)
Every phase (1–6) is implemented, committed, and statically verified: `tsc --noEmit` clean, iOS + Android Metro bundles compile (5.4 MB each). **Not yet exercised on a device** — the owner's next step is a full walkthrough in Expo Go (log care, reminders + local notification firing, dress-up/shop, pet detail health records, family invite, paywall mock purchase, cross-check writes against the web demo).

### Bug-fix batch (2026-07-18, from owner + Kemal reports) — all landed, needs device verify

- **Android invisible bottom nav** (Kemal, high): NativeTabs used iOS-only SF Symbols → glyphs blank on Android. Fixed in `app/(tabs)/_layout.tsx` by (a) `androidSrc={<VectorIcon family={Ionicons} name=… />}` per tab — NativeTabs' own `VectorIcon` helper rasterizes an @expo/vector-icons glyph into an image the Android bar can draw (passing a raw react-native-svg element did NOT work), and (b) setting `backgroundColor`/`iconColor` on `<NativeTabs>` for Android so the bar renders opaque instead of blending into the page. iOS keeps SF Symbols via `sf`. Tab order is Logs · Care · Home(center) · Pets · Settings.
- **Huawei app starts mid-screen / empty top** (Kemal, high): no `SafeAreaProvider` existed though `useSafeAreaInsets` was consumed. Added `SafeAreaProvider initialMetrics={initialWindowMetrics}` at root (`app/_layout.tsx`). This is also the most likely fix for the iOS "heading not showing" / "home text invisible" reports (wrong `useHeaderHeight`) — **verify on iPhone**.
- **Sign out / delete account** (`app/settings/account.tsx`): replaced `ConfirmRow` double-tap with native `Alert.alert` pop-ups (single tap → confirm). `signOut` now `await supabase.auth.signOut({ scope: "local" })` so a flaky network can't strand the user. Delete now calls the `delete-account` Edge Function (`supabase.functions.invoke`) then signs out — **needs the function deployed (EAS step 3) to work on device**.
- **Unwanted Android ripple** on nav/care buttons: `android_ripple={null}` on `PressableScale` + `Row` (`components/ui.tsx`).
- **Coins not clickable**: `CoinPill` takes optional `onPress` (wraps in PressableScale); wired on home + logs headers → `/pets` (the cosmetics shop).
- **Notifications not clickable / overlapping buttons**: Activity "Recent activity" rows now have `onPress` → pet detail + chevron (`app/activity.tsx`); header trailing gap widened (`components/Screen.tsx`).
- **Logs grid** → 3 rows × 2 columns (`tileWrap` flexBasis 30%→47%).
- **iPhone clock-style pickers** for weight/age: new `components/WheelPicker.tsx` (snapping ScrollView, no native dep); `EditStatSheet` shows it when `min`/`max` passed; wired at all weight/age call sites (home, pets, plan, pet/[id]).
- **PetPal+ locked Care**: removed the fake transparent-text "blur"; shows real, readable feature previews (`app/(tabs)/plan/index.tsx`).
- **Accessibility now functional**: `useReduceMotion()` (pref OR OS setting) gates PressableScale/CoinPill animations; added a Haptics toggle consumed via `hapticsEnabled()` (`lib/a11y.tsx`, `components/ui.tsx`, `app/settings/accessibility.tsx`).
- **New: Support** rows (email via mailto + Help center via expo-web-browser) in the settings hub.
- **New: How-to guides** — swipeable instruction slider at `app/instructions.tsx` (weight check, dental, grooming, nails, feeding, vet visits), linked from Settings › Learn & Support.
- **Per-user notification on your own actions**: `notifyActionLogged` fires an immediate local notification from `logAction` (gated on the actor's care pref) — reports said the actor never got notified (`lib/notifications.ts`, `lib/store.tsx`).
- **Animations**: `components/Motion.tsx` (`FadeInItem`/`FadeInView`, reduce-motion aware); staggered entrances on the activity feed + logs grid. More surfaces can adopt it.

### Bug-fix batch round 2 (2026-07-18, owner follow-ups + corrections) — landed, needs device verify

- **iOS header architecture change** (fixes "massive gap at top / no page title" + "back button is just a glass border, no 'Back' text" + "two overlapping bells on home"): `nativeHeaderOptions` in `components/Screen.tsx` no longer sets `headerTransparent` on iOS — the header is now a standard OPAQUE native header (UIKit auto-blurs on scroll). Transparent + large-title was leaving a blank inset with an unpainted title and double-rendering `headerRight`. Also added `headerBackButtonDisplayMode: "default"` so the chevron shows the "Back" label. **All three are one root cause; confirm on a real iPhone (I'm on Windows — no iOS simulator, couldn't screenshot).**
- **Care-page overscroll nav-squish**: removed `minimizeBehavior="onScrollDown"` from `NativeTabs` (`app/(tabs)/_layout.tsx`) — that native minimize was the squish-to-left on overscroll.
- **REVERSAL — do NOT notify the actor**: round-1 added a local push to the person who logs an action; the owner then asked for the opposite. Removed `notifyActionLogged` and its call — the actor only gets the in-app toast now. (Other-member notification still lives in `raiseFeedingAlert`/`raiseCareAlert`.)
- **Notifications expand + redirect**: "Needs attention" alerts on `app/activity.tsx` are now tap-to-expand (chevron) revealing a body line + a "Go to reminders"/"Book a vet" button that redirects to the item needing attention.
- **Two-column wheel picker**: `components/WheelPicker.tsx` rebuilt — separate whole-number wheel + decimal wheel (e.g. "12" · ".4"), shared selection band. `EditStatSheet` uses `min`/`max`/`unit`/`decimalPlaces` (the old `step` prop is gone; all call sites updated).
- **Logs tiles**: icon centered at top (48px circle, 24px glyph), label centered beneath (`app/(tabs)/logs/index.tsx`), still 3×2.
- **Coins page** (`app/coins.tsx`, new): balance hero + buyable coin packs (mock "coming soon" purchase via toast — real IAP is an EAS-cutover item, same gateway as PetPal+) + "earn coins free" explainer. `CoinPill` now routes to `/coins` (was `/pets`).
- **Instructions expanded** (`app/instructions.tsx`): 6 guides now have multiple sections, richer steps, a pro-tip card, and inline theme-colored SVG diagrams (body-condition silhouettes, toothbrush 45° angle, nail-quick cut line). Each card scrolls vertically; still a horizontal swipe slider.

### Bug-fix batch round 3 (2026-07-18, from an on-device iOS screenshot + follow-ups)

- **iOS header rebuilt as in-content title** (the real fix — a screenshot showed a big blank gap with no "Home" title, only the floating accessories): the native large-title header wasn't painting in Expo Go iOS. `TabScreen` now renders the page title + subtitle as the **first scrollable content** (`styles.pageTitle`), and `tabStackScreenOptions` uses a plain small header (`headerTitle: ""`) that only carries the trailing accessories. Device-independent; the title always shows. `nativeHeaderOptions` stays opaque + `headerBackButtonDisplayMode: "default"` from round 2.
- **Header "island" consistency**: the coins pill + bell now render on **every** tab via one shared `components/HeaderActions.tsx` (coins → `/coins`, bell → `/activity`). Previously tabs without coins showed a lone bell in a coin-shaped gap. All five tabs use `trailing={<HeaderActions />}`.
- **Streak in Home header**: a `StreakPill` (flame + count) sits left of the header island on Home and opens the **StreakCalendarSheet** (not account settings).
- **Bottom sheets sizing** (`components/Sheet.tsx`): height is now content-driven and clamped to `SCREEN_H - (safe-area-top + 24)`, animated in by the panel's own measured height, and the inner scroll leaves room for the handle — so sheets rise enough to show everything but never slide under the status bar or clip the last row.
- **Guides feature (`/impeccable craft`)** — Instructions is now a real feature, not one swipe screen:
  - `lib/guides.tsx` — single source of truth for guide content + the inline SVG diagrams.
  - `/instructions` — a clean tappable list menu of guides (icon · title · summary · read-time).
  - `/instructions/[id]` — per-guide detail (hero, diagram, numbered sections, pro-tip).
  - **Care tab** has a "How-to guides" section: a titled header with "See all" + a horizontal rail of guide chips (available whether or not PetPal+ is active). Reached from Settings too.

**Deferred (agreed with owner): full dark mode** — the color tokens are baked into ~37 module-level `StyleSheet.create` calls; real dark mode needs a `useTheme()` refactor across all of them + on-device checking. Scheduled as its own dedicated pass. `app.json` is still `userInterfaceStyle: "light"`.

### Bug-fix batch round 4 (2026-07-19)

- **Wheel picker rewritten** (`components/WheelPicker.tsx`) — the old one jittered because each scroll fired `onChange` → re-render → `contentOffset` reset → scroll jump. Now each column is UNCONTROLLED while scrolling: initial position set once via imperative `scrollTo`, centered row tracked in local state for highlighting, `onChange` fires only on settle, and an external value change re-aligns only when it differs and not mid-scroll. Two columns (whole · decimal) with one measured selection band.
- **3D pet is now REAL voxel 3D** (`components/pixel/Pet3D.tsx`) — replaced the fake CSS-perspective sprite with a three.js model via `expo-gl` + `expo-three` (all work in Expo Go on SDK 54; added `three` + `@types/three`). Every opaque sprite pixel (+ cosmetics) becomes a cube in an `InstancedMesh`, extruded `DEPTH=3` voxels; idle slow-spin + drag-to-rotate. The **"3D mode" toggle is gone** — the Pets stage is always the voxel pet (`app/(tabs)/pets/index.tsx`; removed `threeD` state + toggle styles, `PixelPet` no longer imported there). Bundle grew ~5.4→8.6 MB (three.js). NOTE: renders via GLView — verify on device; if perf is an issue on low-end Android, cap instance count or lower DEPTH.
- **Accessibility now does real things** (`app/settings/accessibility.tsx`, `lib/a11y.tsx`, `components/Sheet.tsx`) — reduce-motion gates animations (already), haptics gates vibrations + a "Test haptics" row, and **reduce-transparency now actually applies** (solidifies the Sheet backdrop). Added a "Text size, bold & contrast" row that deep-links to OS settings (`Linking.openSettings()` / `app-settings:`), grouped In-app vs System.
- **Delete account** (`app/settings/account.tsx`) — now surfaces the *real* failure honestly instead of "try again in a moment." Root cause unchanged: **the `delete-account` Edge Function isn't deployed** (EAS-cutover item). To make delete actually work: `supabase functions deploy delete-account` (needs the Supabase CLI + service-role env on the project). Until then it shows "deletion unavailable — goes live with the next backend update."

### Bug-fix batch round 5 (2026-07-19, full-system audit — "all buttons click")

Four read-only audit agents swept tabs, pushed screens, shared components and the data layer;
every finding below was re-verified against source before being fixed. `tsc --noEmit` clean,
`expo lint` 0 errors, iOS + Android both bundle (8.51 MB each).

- **THE header-button bug, root-caused** (`components/HeaderActions.tsx`, `SettingsButton.tsx`,
  `app/(tabs)/home/index.tsx`). Two independent causes, neither a styling mistake:
  1. **`react-native-screens` only hit-tests ONE `headerRight` child.** `headerRight` is wrapped
     in a single `UIBarButtonItem`; `RNSScreenStackHeaderConfig.mm`'s `hitTest:` (~line 171)
     iterates `_reactSubviews`, overwrites its `headerComponent` local on each positive hit, and
     **returns on the first left/right subview**. A fragment of sibling controls therefore leaves
     only one of them tappable. Home was worst: streak + coins + bell + gear = 4 siblings.
     **Fix:** `HeaderActions` now renders exactly ONE wrapper `View` (row, gap 12) and takes a
     `leading` prop — Home passes `StreakPill` *into* the island instead of beside it.
     **Never return a fragment from `trailing`/`headerRight`.**
  2. **Toasts painted over the header.** `Toasts` sat at `top: insets.top + 8` — inside the nav
     bar's band — mounted after `<Stack>`, so each full-width toast card physically covered the
     island. **Fix:** the stack is now anchored to the bottom (above the tab bar), animates with
     `SlideInDown`/`FadeOutDown`, and caps at 3 visible.
  - `SettingsButton` also stopped returning `null` inside `/settings` (that changed the header's
    subview count between screens).
- **Sheets** (`components/Sheet.tsx`): `kav` was missing `flex: 1`, so the content-sized
  `KeyboardAvoidingView` computed a ~zero inset and **the keyboard covered every text-input
  sheet's Save button**. Also: modal content now gets its own `GestureHandlerRootView` (a RN
  `Modal` is a separate native window outside the app's root one — swipe-to-dismiss was dead on
  Android), `useWindowDimensions()` replaces the module-scope `Dimensions.get` (stale after
  rotation), the hardcoded `maxHeight: maxPanelH - 33` is gone in favour of `flexShrink: 1`, the
  panel measures its height once (growing content made it jump), the handle zone no longer spans
  the full width, and the pan gained `failOffsetY(-10)`.
- **`Row` trailing** (`components/ui.tsx`): `trailing` renders *inside* Row's `Pressable`, so a
  row with its own `onPress` swallowed taps meant for an interactive trailing control (reliably
  on Android). Added `interactiveTrailing` (hands the touch to the trailing subtree) and
  `switchValue` (announces the row as a switch). `Toggle` gained `interactive={false}` for the
  indicator-only case. Settings toggles flipped twice and cancelled out; Family's "View" opened
  the edit sheet instead of the pet. Trailing is also `flexShrink: 0` now, so a wide control no
  longer collapses the title to nothing.
- **Care alerts resurrected themselves** (`lib/store.tsx`): the dedupe guard required `r.alert`,
  but `dismissAllAlerts` clears that flag while leaving `done: false` — so the 15-minute
  re-check treated every dismissed alert as absent and **inserted a new DB row for it**. Cleared
  alerts came back within 15 min and the table grew duplicates forever. Same bug in
  `raiseFeedingAlert`. Both now match on `!done && alertKind` only.
- **Pull-to-refresh could hang forever** (`lib/store.tsx`): `load()`'s
  `if (user.id === lastLoadedUserId) return` fired before `resolvePendingRefreshes()`;
  `onAuthStateChange` calls `load()` on every `TOKEN_REFRESHED` (~hourly) / `SIGNED_IN`, so a
  refresh in flight when one landed never settled and the spinner span until restart.
- **Hats were unreachable** (`app/(tabs)/pets/index.tsx`): the head-slot button sat at
  `{left:-8, top:-8}` — partly **outside `petBox`, and a child outside its parent's bounds never
  receives touches on Android** — with the rest overlapping `Pet3D`'s full-bleed `GLView` pan.
  `petBox` now sizes to include the overhang (negative margin preserves the layout), the button
  carries `elevation` as well as `zIndex`, and `Pet3D`'s pan requires `minDistance(8)` so it
  stops swallowing taps.
- **Wheel-in-sheet** (`components/WheelPicker.tsx`): columns are `ScrollView`s nested in the
  sheet's own scroller, and on iOS the outer one won the pan so wheels wouldn't turn
  (`nestedScrollEnabled` is Android-only). Each column is now wrapped in
  `Gesture.Native().blocksExternalGesture()`; `EditStatSheet` also passes `scrollable={false}`.
- **Smaller, verified:** retro-log "Log it" bound `disabled` to HH:MM syntax while the handler
  required a *past* time — enabled button, no-op tap (now one shared value + an inline hint);
  `onSubmitEditing` bypassed the auth buttons' loading guard (double signup requests); signup's
  "Check your email" branch is scrollable + inset (its only exit link could fall off-screen);
  community `VoteControl` moved out of the card's press region (upvoting navigated instead);
  breed chips shrink instead of pushing the family label off the card; Home clamps `petIndex`
  when a pet is deleted and widens the hero swipe threshold to 25 (small chips/dots were losing
  taps); pet-less households no longer render "checkup — undefined" on Activity/Vets; guide chip
  labels use `minHeight`; five bare `.then()` calls that swallowed Supabase errors now route
  through a new `bestEffort()` logger.
- **Not changed (audit was wrong):** reminder delete already has 5s undo via `undoableDelete`, so
  it was left one-tap. `@gorhom/bottom-sheet` is a dependency but unused — `Sheet` is hand-rolled
  on RN `Modal`, so no `BottomSheetModalProvider` is needed. Worth removing the dep.

**Still needs a device / not fully closable statically:**

- **Round 5 needs a full walkthrough** — all of the above is statically verified only. Priority
  checks: every header button on every tab (then again *while a toast is showing*), the hat slot,
  settings toggles, Family "View", community upvote, a keyboard-covered sheet footer, and the
  weight wheel on iOS. Android matters here — several of these failed *only* on Android.
- iOS "heading not showing", "back button doesn't work", overscroll nav-squish — believed addressed by the SafeAreaProvider fix but must be confirmed on a real iPhone; the NativeTabs overscroll-minimize behavior is system-owned.
- Delete-account only works once the Edge Function is deployed.
- Full family-wide (not just actor) push notifications remain an EAS-cutover item (no notifications table yet).

What exists:
- **Phase 1** auth (login/signup/confirm), session persistence, full store port (`lib/store.tsx`, ~2,200 lines: optimistic writes, rollback, 5s undo, care alerts, streak/coin debounce).
- **Phase 2** design system (`lib/theme.ts` = exact oklch→sRGB web palette), ui primitives, modal Sheet, TabScreen/PushedScreen scaffolds (large-title → condensed blur), tab shell, pixel sprite engine (run-length merged SVG), GeistPixel + Inter fonts.
- **Phase 3** Logs tab (action grid, portion picker, retro logging, vet-visit sheet, +5 coin pop, haptics), Pets tab (arcade stage, Pet3D drag-tilt, cosmetics shop, add-a-pet), StreakCalendarSheet.
- **Phase 4** Reminders agenda (repeats, roll-forward, stepper date/time pickers), Activity hub (deduped alerts, premium insights, day-grouped feed), local notifications (`lib/notifications.ts` cancel-all+resync ≤60, `NotificationSync` in root layout, tap → /reminders).
- **Phase 5** Pet detail (identity/weight chart/supplies/meds/vaccinations/vet visits/delete), emergency card with native Share, Care Plan tab (checklist, breed guides, custom plans, premium gate), Home (swipeable hero, meals bar, attention banner), Welcome, settings hub + family/account/general/accessibility, vets marketplace, join landing.
- **Phase 6** `PurchasesGateway` + mock (`providers/purchases/`), Paywall through the gateway, migration 0015, Edge Functions (`delete-account`, `send-due-reminders`, `rc-webhook`), `lib/pushTokens.ts`.

## File map
- `lib/store.tsx` — THE app state (ported web store). Stable; don't modify for UI work. `lib/data.ts` — types + reference data (verbatim web copy). `lib/theme.ts` — all tokens.
- `components/` — ui.tsx primitives, Screen.tsx scaffolds, Sheet, Icons, Paywall, Toasts, NotificationSync, per-feature sheets; `components/pixel/` — sprite engine + data + Pet3D + PixelChart.
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
| Account deletion | Now calls `delete-account` Edge Function + signs out | — (works once function deployed, EAS step 3) | EAS cutover step 3 |
| Weight/age inputs | JS `WheelPicker` (iOS clock-style, no native dep) | Fine as-is; native picker optional | — |
| Date/time inputs | Chip/stepper pickers (no native dep) | Consider native datetimepicker in dev build | Post-verify polish |
| A11y prefs | Reduce-motion (pref OR OS) + haptics now consumed | Extend gating to more animated surfaces | Polish |
| Notifications | Local scheduling + immediate local notif on own action | Family-wide remote push (needs notifications table) | EAS cutover |
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
