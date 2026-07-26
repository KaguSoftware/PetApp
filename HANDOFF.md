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

### Logs redesign + care scheduling system (2026-07-20, plan-mode collab with owner) — built, statically verified, NEEDS device walkthrough + migration 0017

Full redo of the Logs tab (owner request) plus a new scheduling system. Owner decisions locked in
discovery: status-dashboard-first · avatar-row pet selector · one dashboard row per medication ·
grace window per schedule (default 30 min) · local per-device notifications for v1 · row-body tap
opens the schedule editor. Architecture: **schedules are evaluated live** (never written into
`reminders`) by pure helpers in `lib/careStatus.ts`; notifications merge schedule occurrences with
reminder occurrences under the 60 cap.

- **DB**: `supabase/migrations/0017_care_schedules.sql` — `care_schedules` table (jsonb `slots`
  [{time,label,grams}], `days_mask` bit0=Sunday, `interval_days`/`anchor_ts` for groom/vet
  cadences, `grace_minutes`) + nullable `activities.med_id`. **NOT YET APPLIED** — the local
  Supabase CLI login only has KaguWebsite/KaguOs, no access to project `mpsyprtnejjbnhyaiidn`.
  Until applied the app degrades gracefully (`scheduleSchemaRef` in store.tsx: schedules stay
  local-only with an honest toast, activity inserts omit med_id).
- **Store**: `schedules` on AppState; parallel hydration fetch (NOT in HOUSEHOLD_SELECT, so a
  pre-0017 DB degrades scheduling only); `setCareSchedule`/`deleteCareSchedule` (optimistic
  upsert/rollback); `logAction` gained `medId` 5th param; `deleteMed` cascades schedules locally.
- **careStatus.ts** state machine: done/due/overdue/upcoming/unscheduled; done = logged since
  `prev slot − grace` AND before `next slot − grace`; overdue = unlogged >60 min past slot;
  unscheduled falls back to the old count targets exactly. `effectiveDailyTarget` drives Home's
  meals bar (home/index.tsx) so it matches the schedule's slot count.
- **Notifications**: `syncScheduledNotifications(reminders, pets, schedules, activities)` — merged
  + sorted + capped at 60; slots already logged for their window are skipped; schedule slots
  respect the member's `notifyCareReminders` toggle (reminders keep old behavior); taps route to
  `/logs`.
- **New UI**: `components/PetSelectorRow.tsx` (avatar row, accent ring + scale on selected),
  `components/CareStatusRow.tsx` ("Fed 7:42 AM by Sara" + "Next Dinner · 6:00 PM", state-colored
  IconCircle, one-tap Log SmallButton with CoinPop, red ! badge preserved),
  `components/ScheduleEditorSheet.tsx` (times via TimeStepper, optional slot names, per-slot
  portions for fed, 7-day chips or every-N-days for groom/vet, grace stepper, remove),
  `components/MedPickerSheet.tsx` ("which med?" + inline "Add new medication"),
  `components/TimeStepper.tsx` (Stepper extracted from reminders.tsx — reminders imports it back).
- **Logs page** (`app/(tabs)/logs/index.tsx`, full rewrite): PetSelectorRow → "Right now" Group of
  CareStatusRows (species actions, per-med rows, vet, "Add medication" row) → retro-log link
  (meds chip now asks which med inline) → "Today" timeline (member InitialAvatar · "Sara fed
  Milo" · time). 60s ticker keeps grace-window flips live. Old tile grid + text pet switcher gone.
- **Meds.tsx**: med rows tap → schedule editor; subtitle shows `describeSchedule` when set.
- Verified: `tsc --noEmit` clean, `expo lint` clean, iOS+Android bundles compile (8.56 MB).

### Wheel pickers everywhere + hero swipe animation (2026-07-20) — built, statically verified

- **`TimeWheelPicker`** (`components/WheelPicker.tsx`) — iPhone clock-style hour · minute · AM/PM
  wheels sharing one selection band. Value is 24h `"HH:MM"` (the `CareScheduleSlot.time` format), so
  it drops in anywhere a time-of-day is edited. `minuteStep` prop (5 default, 1 for exact times).
  Replaced EVERY time selector: schedule editor slot times (meals/meds/vet/grooming), the reminders
  add sheet, and the Logs retro-log (which was the only place you had to *type* `HH:MM` — it now
  seeds to the current time and the "invalid format" failure mode is gone).
  - Schedule editor shows a tappable time chip per slot; tapping expands ONE wheel at a time
    (`openWheel` state) so a 10-meal schedule isn't ten stacked pickers.
  - `TimeStepper` (the −/+ control) is now unused by app code but `Stepper` is still used for
    day-offset / interval-days / grace-minutes in reminders + schedule editor.
- **Med frequency is no longer free text** — `SingleWheelPicker` over `MED_FREQUENCIES`
  ("Once daily", "Twice daily", "Monthly", …), defaulting to `DEFAULT_MED_FREQUENCY`. Applies to
  both add-med forms (`components/Meds.tsx`, `components/MedPickerSheet.tsx`). Still stored as the
  same `meds.frequency` string, so nothing downstream changed.
- **Fixed three real wheel bugs** (the "insanely buggy" weight/age report), all in shared code:
  1. **Wheels never scrolled to their initial value.** `centerIndex` was *initialized* to
     `targetIndex`, so the align effect's `centerIndex !== targetIndex` guard was false on mount and
     the imperative `scrollTo` never fired — the column sat parked at row 0 while highlighting a
     different row. Now tracked via a separate `scrollIndex` ref (actual scroll position, distinct
     from the highlight index) and deferred through `requestAnimationFrame` (a `scrollTo` before
     layout is silently dropped). This affected every wheel: weight, age, and breed.
  2. **0.0 dead-end on weight.** The whole column started at `floor(min)`, so `min=0.1` still put a
     selectable `0` on the wheel; picking 0 with decimal 0 gave `0.0`, which failed
     EditStatSheet's `> 0` check and greyed out Save with nothing explaining why. Columns are now
     range-aware (`ceil(min)`, and the decimal column trims values outside [min,max] at boundary
     rows), so an invalid value is unselectable and `valid` is just `isFinite`. Side effect: age
     `0.0` (a newborn) is now saveable — it wasn't before.
  3. **Out-of-range composition.** Spinning the whole column to `max` with a leftover decimal
     emitted e.g. `120.7`. `WheelPicker` now clamps its composed output to the columns' own range.
- **Home pet hero swipe animation** (`app/(tabs)/home/index.tsx`) — the card follows the finger
  (damped), then slides+fades out in the swipe direction, swaps the pet at the midpoint, and slides
  in from the opposite edge (130ms out / 260ms in, ease-out). Rubber-bands back at the ends of the
  list and on a too-short swipe. Reduce-motion collapses it to a plain swap.
- Verified: `tsc --noEmit` clean, `expo lint` clean, iOS + Android bundles compile (8.57 MB).
  **Not yet exercised on a device** — the wheels especially need a real-finger check.

### Phase 8 fixes + THE silent-crash root cause (2026-07-20) — **crash fix CONFIRMED on device**

Five owner-reported issues; 4 of 5 landed (scheduling-optional is still open, see Roadmap).

- **App closed silently on DB fetch — ROOT-CAUSED AND FIXED (owner-verified working).** Two
  separate bugs wearing the same costume, both "Expo Go vanishes, empty Metro log":
  1. `d1de0cc` — `WheelPicker`'s `requestAnimationFrame` → `scrollTo` fired against a torn-down
     native `ScrollView` when a sheet closed in the same tick. Fixed with `cancelAnimationFrame`
     in the effect cleanup.
  2. `069e61a`+ — the Home hero carousel's worklets **captured plain JS values** (`heroW`,
     `lastIndex`, `reduceMotion`) that all change at the exact moment the Supabase promise
     resolves, and `PetDot` **called `withAlpha()` inside `useAnimatedStyle`**. Fixed by mirroring
     into shared values, hoisting the color range to module scope, and marking every callback
     `"worklet"`. **See the Reanimated rule in Gotchas — this is the one to not repeat.**
  Diagnosis only became possible from the **iOS crash report**; three rounds of reading the source
  and asserting a cause were all wrong. Get the report first next time.
- **Header hit targets**: `hitSlop={6}` on bell/gear (38pt pill → 50pt target), island gap 12→8 so
  the dead space between controls no longer reads as tappable, `hitSlop` on `CoinPill` (~26pt tall).
- **Android status-bar overlap**: `useHeaderStatusBarInset()` (`components/Screen.tsx`) feeds
  `headerStatusBarHeight` from safe-area insets on Android only (edge-to-edge draws under the bar);
  wired into both `TabScreen` and `PushedScreen`.
- **Cat cosmetics**: face items re-authored on a 9-wide grid (4px lenses — at 7 wide they rendered
  as 2px smudges) + a `placeBySpecies` override, because cat eyes span cols 3-12 rows 7-8 and the
  dog's are narrower and a row higher. `placementFor(cos, species)` is now the single accessor,
  used by both `PixelPet` and `Pet3D`.
- **Home hero is a real carousel** (no fade): fixed outer frame with `overflow:hidden`, an inner
  track holding every pet translating by `-track * heroW`, velocity-projected paging, rubber-band
  at the ends, and page dots that stretch/darken continuously off the live track value.

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

### Home shortcuts + tagged reminders + supply highlights (2026-07-20, owner request) — built, statically verified, NEEDS device walkthrough + migration 0018

Three Home additions (owner: "/impeccable + /ui-ux-pro-max"). `tsc --noEmit` clean, `expo lint`
clean, iOS + Android both bundle (8.63 MB each).

- **Shortcuts** (`components/ShortcutsSection.tsx` + `ShortcutBuilderSheet.tsx`, new): a launcher
  grid of one-tap care logs pinned to Home. Builder = pick pet(s) → action → (portion / med) →
  icon → label. **Multi-select pets** — one tile can bulk-log the whole household ("Fed all");
  grams are sized to EACH pet's own `cupGrams` at log time (a cat and a dog get their own correct
  amounts). Fed offers a baked portion (true 1-tap) OR, single-pet only, "Ask each time" → opens
  `FeedPortionSheet`. Edit toggle reveals per-tile remove badges; tiles show up to 2 pet avatars +
  "+N". Teaching empty state. Tap logs via `logAction` (per pet), 900 ms check flash (reduce-motion
  aware).
- **Reminders unlocked from the hero pet** (`app/(tabs)/home/index.tsx`): the section now lists the
  next 3 upcoming reminders across ALL pets, each row tagged with a pet avatar + a name chip. "See
  all" → `/reminders`. Removed the old single-pet next-reminder row + overdue sheet (the attention
  banner still summarizes alerts).
- **Highlights** (`components/HighlightsSection.tsx`, new): collective Food + Litter levels across
  every pet (grouped by supply icon bowl/broom). Each card shows the worst-off supply's meter +
  status band (Well stocked / Getting low / Restock soon) as the "next purchase" cue; tap → that
  pet's detail (where restock lives). Hidden when a category has no supplies.
- **Store/schema**: `Shortcut` type + `state.shortcuts` (`lib/data.ts`); `addShortcut` /
  `deleteShortcut`, hydration `fetchShortcuts` (`lib/store.tsx`). **Migration `0018_shortcuts.sql`
  NOT YET APPLIED** (same CLI-access blocker as 0017). Degrades exactly like schedules: when the
  table is missing, shortcuts persist to an on-device AsyncStorage cache (keyed by household) so
  they still survive restarts, with an honest toast. When the table later appears, a one-time
  local→shared lift in `fetchShortcuts` uploads the cached rows and clears the cache. `pet_ids` is
  a `uuid[]` (not an FK column) so one tile can cover many pets; deleteMed cascades shortcuts
  locally, deleted-pet rows are pruned by a render guard.

### Owner walkthrough bug-fix batch (2026-07-23, plan-mode collab) — built, statically verified, NEEDS device walkthrough + migrations 0022–0024

From Parsa's ~21 on-device reports. `tsc --noEmit` clean, `expo lint` 0 errors (1 pre-existing Pet3D warning), iOS + Android bundle (8.66 MB). Plan: `~/.claude/plans/in-the-pets-tab-floofy-bachman.md`.

- **BACK BUTTON root-caused**: a native iOS 26 bug in react-native-screens 4.16.0 (baked into Expo Go SDK 54) — the system back item renders but taps are dead when `headerShown:false`/custom headers are in the ancestry (rn-screens #3294/#3270; expo discussion #40848). No JS upgrade can fix it inside Expo Go. **Fix: custom `HeaderBackButton`** (owner-approved) — iOS-only `headerLeft` chevron+"Back" calling `router.back()`, wired via `nativeHeaderOptions` (`components/Screen.tsx`) with `headerBackVisible:false`. Android keeps the native arrow; edge-swipe unaffected. **SCOPE(EAS cutover): remove once dev builds pin a fixed rn-screens.**
- **Reminders "+" iOS visual bug**: was a `PressableScale` inside the UIBarButtonItem (scale transform clips against bar bounds) — now a plain `Pressable` + opacity dim, 38pt, matching the bell/gear pattern (`app/reminders.tsx`). Same pattern applied to the pet-card share button.
- **Migrations written, NOT applied** (same CLI-access blocker): `0022_activity_duration.sql` (activities.duration_minutes), `0023_reminder_dedupe.sql` (purges duplicate alert rows, adds generated `alert_day` + partial unique index on `(pet_id, coalesce(alert_kind,title), alert_day) where alert and not done` — THE "billions of duplicates" fix), `0024_streak_bonus.sql` (households.last_streak_bonus). All degrade gracefully pre-migration (probe/learn patterns in store.tsx; duration learns from the first bounced insert).
- **Exercise & play measured**: `logAction` 6th param `durationMinutes`; walk taps open `components/DurationPickerSheet.tsx` (chips 10–90 min); shown in Logs "Today" timeline via `formatDuration`.
- **Streak milestone bonus**: every 10-day multiple pays +20 coins once (marker `last_streak_bonus` in rewardsRef, persisted with the debounced counters write; lowered on streak break so milestones re-pay after a rebuild). Toast "N-day streak — bonus!". Mobile-only until web adopts the column.
- **Age auto-update**: on app-foreground across a day change, ages re-derive from birthDate (`RNAppState` listener in store.tsx).
- **Households**: `joinHousehold` now sets `user_profiles.active_household_id` BEFORE the reload (it used to re-hydrate the OLD household); join page navigates to /home on success. **Still needs the two-account on-device audit** (invite link → join → switch; RPC `join_household` lives in web migrations, assumed working). Invite web origin is still the `https://petpal.app` placeholder.
- **Pet selector unified**: Care + Pets tabs now use `PetSelectorRow` (avatar row) like Logs; Pets tab gets a trailing "+" tile (`onAdd` prop) so add-a-pet stays one tap. Old inline "name+chevron→sheet" switchers deleted.
- **Notifications page** (`app/activity.tsx`, title now "Notifications"): stripped to alerts + activity feed only — removed PetPal+ upsell/Paywall, nav rows, vet-booking sheet, per-pet filter chips. Render-time alert dedupe kept as belt-and-braces until 0023 runs.
- **Pet card redo** (`app/pet/[id]/card.tsx`): body Share button deleted — single 38pt header share; Segmented "Emergency | Profile" replaces the toggle button; both variants render from field-config arrays that ALSO build shareText (one code path). Emergency = microchip/allergy box/meds/contact/vet+phone; Profile = birthday/gotcha/family since/wardrobe.
- **Home hero multi-pet cue**: "1 of 3 pets · swipe to switch" caption under (slightly bigger) dots — plain JS render off petIndex, deliberately not worklet-driven.
- **Vet detail page**: `app/vets.tsx` → `app/vets/{index,[id]}.tsx`; card tap opens the clinic page (hero, specialties, about, call via tel:, directions via maps:, hours, book). Booking sheet extracted to `components/VetBookingSheet.tsx` (shared with the list). `Vet` type gained phone/address/hours/about (static demo data).
- **Retro-log** now a full Row directly under "Add medication" in the Logs "Right now" group (was a buried text link).
- **Sheet composition pass** (subagent, grammar: SheetTitle→FieldLabel'd sections on a 4pt grid→chips/Segmented/wheels→SheetFooter single primary): reminders add-sheet, ScheduleEditorSheet (48pt slot chips, wheel in inset card, destructive Remove), ShortcutBuilderSheet (uniform icon grid), MedPickerSheet, FeedPortionSheet (primary moved into SheetFooter), EditStatSheet. StreakCalendarSheet/EditTextSheet already conformed.
- Gotcha learned: **typed routes did NOT regenerate on `expo export`** — needed a brief `expo start` boot; and dynamic pushes must use the object form (`router.push({pathname:"/vets/[id]", params:{id}})`).

**Device-verify priorities for this batch**: back tap on every pushed screen (the custom headerLeft), reminders "+" render, walk→duration→timeline, avatar selectors, two-account household join/switch, alert dedupe after 0023, 10-day streak bonus once-only, notifications page, pet card share/variants, vet detail links.

### Header fixes + premium sheet redesign (2026-07-24, plan-mode collab) — built, statically verified, NEEDS device walkthrough

Batch 1 — header/nav fixes (`components/Screen.tsx`, `NotificationBell.tsx`, `ui.tsx`, home):
- **"< B" back button**: the UIBarButtonItem squeezed the custom back label to one glyph — `numberOfLines={1}` + `flexShrink: 0` on `backButton`/`backLabel`. Applies to every pushed screen.
- **Header island centering**: removed the bell's iOS-only `translateY: 2` nudge; coin pill fixed at `height: 32` (was padding-derived ~26), Home streak pill 30→32 — both now fill the island next to the 38pt icon pills.
- **iOS bottom overlap**: new `IOS_TAB_BAR_HEIGHT = 49` added to `TabScreen`'s content `paddingBottom` (mirrors the Android 56 allowance) — `unstable-native-tabs` does NOT feed the bar into `insets.bottom` on either platform; the old comment claiming iOS did was wrong.

Batch 2 — premium sheet redesign (owner: "menus feel tacky"; approved direction: **refined chips** — accent discipline, both platforms). All ~30 sheets restyle through the shared shell + primitives:
- **`components/Sheet.tsx`**: panel radius 22→`radius.xl` (28), tighter/deeper shadow, slimmer handle (36×4 @ 0.16), spring entrance (`withSpring` damping 26 / stiffness 300 / mass 0.9; reduce-motion → 120ms timing).
- **`components/ui.tsx`** — the new control vocabulary: full-saturation accent appears ONLY on the primary CTA. `SelectableChip` unselected = card fill + hairline border + `label2` label; selected = `accentSoft` tint + accent-tinted border + `accentDeep` label, colors animated 180ms via `interpolateColor` (border tints hoisted to module consts `CHIP_BORDER`/`CHIP_BORDER_SELECTED` per the worklet rule). `AccentButton` disabled = gray fill + `label3` label (a real state, not opacity 0.4); radius md→lg. `SmallButton` accent tone gets a tinted border + `accentDeep` label. `SheetTitle` 22pt/−0.4; `SheetSubtitle` 14pt; `FieldLabel` 11.5pt/+0.8, section rhythm marginTop 22/bottom 8; `SheetFooter` marginTop 28. `TextField` always has a hairline border; focus = accent border + soft accent glow.
- **`components/ScheduleEditorSheet.tsx`**: timeChip → quiet bordered card with a chevron-down affordance (shadow gone, radius.md); grace hint bumped `label3`→`label2` for contrast. Day letters/portions/cadence chips inherit the new SelectableChip automatically.
- **`components/TimeStepper.tsx`**: stepper card → hairline border (shadow gone), radius.md, `accentDeep` +/− signs.
- Straggler grep confirmed no sheet declares local chip/title/input styles — everything flows from the primitives.

**Device-verify priorities**: back button label on pet profile + settings; header island alignment on Home; scroll-to-bottom on all five tabs (iOS buffer, Android not doubled); sheet spring + chip selection animation (plus reduce-motion instant paths); disabled CTA reads gray (reminder sheet with empty task); day toggles + timeChip in Fed/Groomed schedule; Android hairline borders render.

### FULL ACCOUNTS/AUTH/HOUSEHOLD SYSTEM (2026-07-25/26, plan-mode collab, all 11 owner decisions locked in discovery) — built, statically verified, NEEDS migrations 0026–0030 + dashboard config + two-phone walkthrough

Plan: `~/.claude/plans/i-would-like-to-harmonic-marshmallow.md`. Everything below degrades gracefully against the un-migrated DB (probe patterns) and runs in Expo Go. `tsc --noEmit` clean · `expo lint` clean (pre-existing Pet3D warning only) · iOS 8.80 MB + Android 8.89 MB bundles compile · impeccable detector 0 findings · adversarially reviewed by a 5-dimension agent workflow (its 3 confirmed web-compat defects are FIXED in the migrations as shipped).

**Owner decisions locked (2026-07-25):** stay in Expo Go (Apple native works in Expo Go; Google via system browser, native at EAS cutover) · accounts + claimable cards, view-as REMOVED · owner/admin/member enforced in RLS/RPCs · careful shared-backend changes OK · invites = short codes + petpal:// only (no https origin) · deletion auto-promotes successor (longest-tenured admin→member) · email flows = 6-digit OTP codes in-app · fresh households empty + guided onboarding · default invite multi-use 7-day · admin-granting owner-only · leavers keep their card (unclaimed) + history.

**DB — migrations 0026–0030 (committed, NOT YET APPLIED; apply IN ORDER in the SQL editor):**
- `0026_roles_enforcement.sql` — `has_household_role()` helper; column-level grant closes the self-promotion hole (authenticated may UPDATE only `household_members.member_id` — web view-as untouched); leave/remove DELETE policy; households DELETE owner-only + rename guard trigger (admin+); claimed-card delete guard (only OTHER users' claims block — web view-as pointers don't); owner_id UNIQUE dropped but **replaced by `households_single_owned_guard`** which re-raises a synthetic 23505 on direct duplicate inserts (web bootstrap recovery unchanged) unless `create_household()` sets its transaction flag.
- `0027_household_invites.sql` — `household_invites` (code `XXXX-XXXX` ambiguity-free alphabet, role member|admin, optional `target_member_id` claim-a-card, expiry default 7d, optional max_uses, revocable) + `create_invite`/`redeem_invite`/`revoke_invite` RPCs (P0002 = not found, P0003 = expired/revoked; already-member redeem is idempotent). `join_household(uuid)` untouched — web links keep working.
- `0028_household_management.sql` — `create_household` (EMPTY household + creator card), `leave_household`, `remove_household_member`, `set_member_role` (owner-only), `transfer_ownership`, `prepare_account_deletion` (service-role; sole-member household → delete, owned-shared → promote longest-tenured admin else member) **+ `on_auth_user_deleted` BEFORE DELETE trigger on auth.users** so the web's direct `deleteUser` route gets succession automatically too.
- `0029_conditional_seed.sql` — **ALL demo seeding removed for every client** (owner decision 2026-07-26, superseding the original mobile-only skip): `handle_new_user()` now inserts only the `user_profiles` row. No Mom/Dad/Sara cards, no Mozart/Biscuit, no 340 coins / 260 xp / 4-day streak — for web signups too. Verified against the live DB: a simulated web-style signup produced 0 households / 0 cards / 0 pets / 0 activities and a profile with a null `active_household_id`.
- `0030_user_welcome_attribution.sql` — `activities.user_id` (real account attribution, nullable) + `user_profiles.seen_welcome` (per-user; intro no longer re-fires on household switch).

**Client — auth layer:** `lib/supabase.ts` gains `flowType:"pkce"`. New `lib/auth.ts` is THE auth API: `signInWithApple` (expo-apple-authentication, raw nonce→SHA256 to Apple, raw to Supabase — verified against the native source that expo passes nonce verbatim), `signInWithGoogle` (signInWithOAuth + WebBrowser.openAuthSessionAsync + exchangeCodeForSession; `SCOPE(EAS cutover)`: swap internals to native one-tap), `signUpWithEmail` (passes `seed_demo:false`), `verifyEmailOtp`/`requestPasswordReset`/`resendCode`, `getConnectedIdentities`/`linkGoogle`/`unlinkIdentity`. `components/AuthProviderButtons.tsx` = HIG Apple button (theme-aware) + Google button in house style.

**Routing:** root `_layout.tsx` uses `Stack.Protected` — (auth) for signed-out, EVERYTHING else enumerated in the signed-in block (**new root route files MUST be added there or they ship unguarded**); `/verify` + `/reset-password` deliberately unguarded (OTP creates the session mid-screen). `InboundLinkWatcher` stashes signed-out `petpal://join?code=…` links (AsyncStorage `petpal.pendingInviteCode`), `PendingInviteRunner` replays them post-sign-in; `PushTokenRegistrar` now calls the previously-dead `registerPushToken` (self-guards in Expo Go — EAS step 4 done). `app/auth-callback.tsx` = OAuth landing pad.

**Screens:** (auth) welcome (providers + email) / login (+forgot link, providers) / signup (→ `/verify` code entry, no more dead-end) / forgot; `/verify` (6-digit cells, iOS `oneTimeCode` autofill, purposes signup|recovery|email_change incl. secure-email-change dual codes, 60s resend); `/reset-password`. `(onboarding)` group (zero-membership accounts): create-or-join → name household → first pet (via new shared `components/AddPetSheet.tsx`, extracted from the Pets tab) → invite → home. `join.tsx` rewritten around codes (auto-formats `XXXX-XXXX`; legacy `?f=` UUID links + pre-0027 fallback still work). Family screen rebuilt: Family (accounts w/ role badges + manage sheet: promote/demote/transfer/remove/leave per enforced role) · "Family without the app" (unclaimed cards + Invite-to-claim) · Households (role badges, switch, join, create) · Household (rename, Family ID demoted to web-app footnote, family password) · Pets (unchanged). Account screen: Connected accounts (email/Apple/Google link/unlink), Change password only when an email identity exists, change-email via OTP codes, honest successor delete copy. `switchMember` is deleted from the store.

**Store:** state gains `households[].role/joinedAt`, `myRole`, `accounts[]`, `membershipsKnown` (gates the onboarding redirect so a transient fetch failure never shows first-run). Hydration: profile probe loop (theme_mode 0025 / seen_welcome 0030), dedupe key is now `${user}|${household}` with an in-flight guard (email refreshes on USER_UPDATED without full reload), zero-membership → EMPTY_STATE (demo-seeding `bootstrapHousehold` DELETED; slim `createHouseholdFallback` remains for pre-0028 create). New actions: createHousehold/renameHousehold/leaveHousehold/removeHouseholdMember/setMemberRole/transferOwnership/createInvite/fetchInvites/revokeInvite/redeemInvite — all optimistic-with-rollback or reload, all with missing-migration toasts. `flushCounters()` fires the debounced coins/streak write before every household switch (no cross-household bleed). `logAction` stamps `activities.user_id` (learn-from-bounce like duration). `removeMember` refuses claimed cards client-side.

**Edge fn:** `delete-account` now calls `prepare_account_deletion` BEFORE `deleteUser` and returns 409 "backend migration 0028 required" instead of ever cascading a shared household. Still deploys at EAS cutover; app copy stays honest meanwhile.

**⚠️ OWNER SETUP CHECKLIST:**
1. ~~Apply `0031`, `0032`, `0033`~~ **DONE 2026-07-26** — all three pushed via `npx supabase db push --linked` and verified live: `create_invite.proconfig` = `{search_path=public, extensions}`; all 14 realtime tables in the `supabase_realtime` publication **and** all 14 at `relreplident='f'`; `coin_grants`, `grant_household_coins`, `guard_member_write` + the `members_write_guard` trigger all present. Re-verify any time with:
   `select tablename from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' order by 1;`
   `select relname, relreplident from pg_class where relname='activities';` (expect `f` — without it realtime DELETEs never propagate)
   ~~Apply migrations 0025–0030~~ **DONE 2026-07-26** — the Supabase CLI now has access to project `mpsyprtnejjbnhyaiidn` (it didn't in earlier sessions), so `npx supabase db push --linked` applied **0025–0030**. Verified live: all 12 RPCs present, `household_invites` table created, `activities.user_id` + `user_profiles.seen_welcome` added, `households_owner_id_key` dropped. The database was also **wiped clean** at the owner's request (0 accounts / households / pets / profiles). Use `npx supabase db query --linked --file <sql>` for future ad-hoc checks; note the CLI role cannot `alter table auth.users disable trigger`.
2. Auth ▸ Providers ▸ Apple: enable; Client IDs `host.exp.Exponent,com.kagu.petpal` (no secret needed for the native flow).
3. Auth ▸ Providers ▸ Google: Google Cloud Console → OAuth client (type **Web application**) with redirect URI `https://mpsyprtnejjbnhyaiidn.supabase.co/auth/v1/callback` → paste client ID + secret into Supabase.
4. Auth ▸ URL Configuration: add `petpal://**` and `exp://**` (if the wildcard is rejected, add the exact `exp://<lan-ip>:8081` shown by `expo start` — changes per network/tunnel; Google bounces with "redirect not allowed" until it matches; Apple is immune). **This same allowlist now also gates the EMAIL links** — as of 2026-07-26 signup/resend/reset pass `emailRedirectTo`, so an unlisted URL makes the emailed link fall back to Site URL instead of opening the app.
5. Auth ▸ Email Templates (Confirm signup / Reset password / Change email): add a line `Your PetPal code: {{ .Token }}` above the existing link (web link flows unaffected). Since 2026-07-26 the link itself also works on mobile (`app/auth-callback.tsx` verifies it), so a template missing `{{ .Token }}` is no longer a dead end — but add it anyway; the code is the faster path.
6. Auth ▸ Settings: enable **Manual linking** (Connected accounts UI needs it); keep Secure email change ON. Note: built-in SMTP ≈ 2 emails/hour — fine for testing, custom SMTP before launch.
7. **RevenueCat** (2026-07-26): create the project + iOS/Android apps; add products `petpal_plus_monthly` and `petpal_coins_{500,1500,4000,10000}` (ids must match `providers/purchases/products.ts` AND `COIN_PACK_COINS` in `supabase/functions/rc-webhook/index.ts`); entitlement id `plus`; put all five in the **current** offering. Paste the PUBLIC SDK keys into `EXPO_PUBLIC_RC_IOS_KEY` / `EXPO_PUBLIC_RC_ANDROID_KEY` in `.env`. Set the webhook to the deployed `rc-webhook` URL with `Authorization: Bearer <RC_WEBHOOK_SECRET>` — **the function now hard-fails 500 if that secret is unset**, by design. Expo Go always uses the mock regardless.

**Two-phone walkthrough (after checklist):** email signup → OTP → onboarding create → first pet → invite; Apple sign-in in Expo Go (name captured once); Google browser round-trip; tap `petpal://join?code=…` while signed OUT → welcome → sign in → join auto-opens → redeem; claim-a-card invite (no duplicate card, history kept); role enforcement (member tries rename/invite → denied; hand-crafted `role` UPDATE → column permission denied); owner promotes → admin powers appear; switch/leave/transfer; forgot-password + change-email OTP; `select prepare_account_deletion('<uid>')` on a throwaway pair in the SQL editor (successor promoted, owner_id moved); intro does NOT re-fire on switch.

**Web-demo follow-ups (small patches in the webdemo repo, found by the review workflow — none block applying the migrations):**
1. `app/api/account/delete/route.ts` — call `prepare_account_deletion` before `deleteUser` (the 0028 auth.users trigger already covers it server-side; the explicit call just makes it visible).
2. `lib/store.tsx` bootstrapHousehold — stop force-seeding when the user simply has zero memberships (post-0029 clean mobile accounts logging into the web get a junk demo household otherwise); its 23505 recovery keeps working thanks to the 0026 guard trigger.
3. `removeMember` — sequence the `current_member_id` repoint after the members DELETE succeeds (partial-write edge if the delete is guard-blocked).

### App-wide dark mode (2026-07-24, owner request) — built, statically verified, NEEDS device walkthrough + migration 0025

- **`lib/theme.ts`**: `lightColors`/`darkColors` (same shape, `Colors` type), `useColors()` hook resolves the live palette from `useStore().themeMode`. Every screen/component that previously imported the static `colors` const now calls the hook (`const colors = useColors();`) and, where a module-scope `StyleSheet.create` baked colors in at import time, a `makeStyles(colors: Colors)` factory memoized per-render via `useMemo` — module-scope JS only runs once per app load, so a plain static object could never react to the toggle.
- **Settings > General > Appearance** (`app/settings/general.tsx`): new section above Units, sun/moon `Segmented` toggle (icon support added to `components/ui.tsx`'s `Segmented`).
- **Per-user, not per-device**: `themeMode` is keyed to the signed-in account (`user_profiles.theme_mode`, migration `0025_user_theme_mode.sql`, **NOT YET APPLIED** — same CLI-access blocker as 0017/0018/0022–0024), not to the household or a single global on-device flag. Degrades gracefully pre-migration (probe/learn pattern in `lib/store.tsx`, `themeModeSchemaRef`): writes/reads fall back to an on-device cache keyed by user id (`petpal.themeMode.<uid>`) so switching accounts on a shared device still can't leak one person's appearance onto another's session — it just doesn't follow the account across devices until 0025 is applied.
- Native header colors (`components/Screen.tsx`) converted from a static exported object to `useNativeHeaderOptions()`/`useTabStackScreenOptions()` hooks called from each Stack's parent (`app/_layout.tsx`, `app/(tabs)/*/_layout.tsx`).
- `npx tsc --noEmit` clean, `expo lint` clean (one pre-existing unrelated warning in `Pet3D.tsx`), `expo export --platform ios` bundles clean (1957 modules).

### Invite 42883 fix + email link verification (2026-07-26) — built, `tsc` clean, NEEDS migration 0031 + dashboard steps 2–6

**The reported bug: "Create & share code" always failed** with `create_invite failed: 42883 | function gen_random_bytes(integer) does not exist`. `0027_household_invites.sql` pins `create_invite` to `set search_path = public`, but its code generator calls **pgcrypto's** `gen_random_bytes(1)` — and on Supabase pgcrypto lives in the `extensions` schema, so it was never resolvable. (The `create extension if not exists pgcrypto` lines in 0016/0017/0018 are silent no-ops there. `gen_random_uuid()` kept working only because since PG13 it's in `pg_catalog`, always implicitly on the path — which is why the table created fine and only code generation blew up.)
- **`0031_invite_code_search_path.sql`** (NEW, **not yet applied**) — `create or replace` of `create_invite`, body byte-identical to 0027 except `set search_path = public, extensions`. Left the call UNQUALIFIED on purpose: Postgres ignores missing schemas in `search_path`, so this also resolves on a plain Postgres where pgcrypto sits in `public`, whereas `extensions.gen_random_bytes(…)` would not.
- **RULE** (also in the migration header): any future SECURITY DEFINER function touching pgcrypto (`gen_random_bytes`/`digest`/`crypt`/`hmac`) must use `set search_path = public, extensions`. The other ~15 SECURITY DEFINER functions stay `= public` — none call pgcrypto.
- **`lib/store.tsx`** — new `isBrokenFunctionBody()` (42883, i.e. the RPC ran but its body couldn't resolve something) joins `isMissingFunction` in `createInvite`: sets `invitesSchemaRef` and toasts "Invite codes need the next backend update" instead of the misleading "Please try again". Any DB without 0031 now degrades cleanly to the legacy Family-ID share.

**Email verification now works via the code AND the link** (owner decision 2026-07-26: cover both). Previously the emailed link was completely unhandled — `auth-callback.tsx` was a bare `<Redirect href="/home" />` and nothing set `emailRedirectTo`, so tapping it did nothing useful and the `/verify` screen was the only path.
- **`lib/auth.ts`** — `emailRedirectTo: authRedirectUrl()` on `signUp` / `resend`, and `redirectTo` on `resetPasswordForEmail` (reusing the existing Expo-Go-vs-real-build redirect builder; the old "no redirectTo on purpose" comment is updated — the 6-digit code is still the primary mobile path, the link is the backstop). New **`completeEmailLink(url, hasSession)`** handles both shapes Supabase sends (`?token_hash=…&type=…` → `verifyOtp`; `?code=…` → PKCE exchange) plus `?error_description=`, and short-circuits when a session already exists so it never re-spends an OAuth code `completeBrowserOAuth` already used. New **`signInWithEmail()`** wraps `signInWithPassword` and flags `needsVerification` on "Email not confirmed".
- **`app/auth-callback.tsx`** — rewritten: reads the opening URL via `Linking.useURL()` (covers cold start), runs `completeEmailLink`, then routes `recovery → /reset-password`, everything else → `/home`; on failure it forwards to `/verify` with the error rather than dead-ending. Spinner while working.
- **`app/_layout.tsx`** — `auth-callback` MOVED out of the `guard={!!session}` block into the deliberately-unguarded group with `verify`/`reset-password`: a confirmation link arrives with no session, so the guard was bouncing it to `(auth)` before it could verify.
- **`app/verify.tsx`** — accepts an `error` param (shown on arrival from a failed link) and, when it's reached without an email (links carry none), renders an email field so resend/verify still work.
- **`app/(auth)/login.tsx`** — uses `signInWithEmail`; an unconfirmed account now resends the code and pushes to `/verify` instead of showing an unactionable error. **`app/(auth)/signup.tsx`** — local email-shape + 6-char password checks before the round-trip. **`lib/authErrors.ts`** — "check your inbox for the link" → "…for the code we sent".

**Still owner-only:** apply 0031, and checklist steps 2–6 below (email templates need `{{ .Token }}` or the code path stays empty — the link handling above is what keeps that from being a dead end).

### 12-item batch: realtime, RevenueCat, Community redesign, roles, invites (2026-07-26) — built, `tsc` + `expo lint` clean, migrations 0031–0033 APPLIED, NEEDS a two-phone walkthrough

Twelve owner-reported items. Owner decisions taken in planning: toasts → **top banner, one at a time**; RevenueCat → **SDK installed, adapter dormant in Expo Go**, env placeholders for keys; coins → **server-granted via webhook**; realtime → **instant for logs, debounced for the rest**; Community → **restructure + restyle**; "Family without the app" → **removed entirely**.

**REALTIME (the headline: co-parents had to pull-to-refresh to see each other's logs).**
- **`0032_realtime.sql`** (NEW, **not applied**) — adds 14 tables to the `supabase_realtime` publication and sets `replica identity full` on them, inside one guarded `do $$` block (skips absent tables via `to_regclass`; the publication-membership check is the idempotency, since `alter publication … add table` has no `IF NOT EXISTS` and raises 42710 on re-run). **`replica identity full` is not optional**: under the default identity a DELETE's old_record carries only the PK, so a binding filtered on `household_id=eq.<id>` cannot MATCH a delete at all — undo-a-log and delete-a-reminder would silently never propagate. Purely additive, invisible to PostgREST, web-demo safe.
- **`lib/store.tsx`** — two channels per household: `petpal:household:<id>` (activities, households, reminders, members, pets, care_schedules, shortcuts, household_members, booked_vets — filtered `household_id=eq.<id>`) and `petpal:pets:<id>` (supplies/weights/meds/vaccinations/vet_visits, filtered `pet_id=in.(…)` since those have no household_id). Filtered rather than unfiltered-plus-RLS because this project is shared with the web demo.
  - **Activities merge instantly**, deduped by `id` — `logAction` generates the id client-side, so that one check covers both the self-echo and duplicate delivery after a resubscribe. Reuses `notifyRecentActivity` for the toast (already dedupes on `notifiedActivityIdsRef`). Deliberately never touches coins/`rewardsRef` or calls `syncCounters`: doing so would have every device write absolute coins on every log, which is exactly the race the 250ms debounce exists to prevent.
  - **`households` UPDATE merges directly and NEVER schedules a reload** — this is the loop-breaker. `load()` stamps `last_seen_at` on every non-realtime load, so routing households to a reload would ping-pong between devices forever. Counters are skipped while `countersTimerRef` is armed (local total is newer).
  - Everything else → **`scheduleSilentReload`**: debounced `setReloadNonce` (600ms trailing, 3s floor), re-arming while `inFlightWritesRef > 0` or the counter debounce is armed. Reuses `reloadNonce` rather than a second fetch-and-merge path so load()'s ~160 lines of mapping can't drift; `hydrated` is only ever set true, so no PageLoading flash.
  - New `loadReasonRef`: a realtime load **skips the write-generating catch-up** (last_seen_at, vaccine-reminder inserts, yesterday's under-feeding checks, `checkCareAlerts`) — otherwise every device re-runs all four on every event.
  - `inFlightWritesRef` is counted in `persist`/`bestEffort`, which every optimistic write funnels through.
  - Degradation: warn-once + 5s→60s backoff via `realtimeEpoch`; if 0032 isn't applied the channel subscribes fine and just delivers nothing (a `__DEV__` first-event-per-table log makes that answerable from the Metro console). **Also new: an unconditional silent reload on every foreground** — realtime never replays what was missed, and the `TOKEN_REFRESHED` load was always swallowed by the `lastLoadedKey` dedupe, so backgrounded sessions used to show stale data until a manual pull.
- **`lib/supabase.ts`** — explicit `realtime: { params: { eventsPerSecond: 10 } }`, plus a note that supabase-js pushes refreshed JWTs to joined channels itself (do NOT add a second listener).

**REVENUECAT / COIN PACKS** (was a hardcoded price list and a "coming soon" toast; SDK wasn't installed).
- `react-native-purchases` installed. **`providers/purchases/revenuecat.ts`** (NEW) implements the existing gateway; **`index.tsx` selects it at RUNTIME** via `require()` behind `Constants.appOwnership !== "expo"` **and** a non-empty API key — a static import would make Metro bundle the native module into Expo Go and crash it. Falls back to the mock on any throw. `configure(userId)` now actually runs, keyed to the Supabase user id (the webhook looks buyers up by `app_user_id`).
- **`providers/purchases/products.ts`** (NEW) is THE catalogue; ids must match App Store/Play, the RevenueCat dashboard, and `COIN_PACK_COINS` in the webhook. Coin amounts live on the SERVER; the client copy is display-only.
- **`app/coins.tsx`** — prices come from offerings (localised `priceString`), never hardcoded; purchase spinner; an "awaiting confirmation" line that clears when the balance moves (instant now via realtime). Expo Go keeps the honest "coming soon" toast via `purchases.live === false`. **`components/Paywall.tsx`** likewise reads its price from offerings.
- **`supabase/functions/rc-webhook/index.ts`** — grants coins on `NON_RENEWING_PURCHASE`, idempotent on `coin_grants.rc_transaction_id` (PK), crediting via the new **relative** `grant_household_coins` RPC so it can't clobber the clients' absolute counter writes. Three correctness fixes: a **missing `RC_WEBHOOK_SECRET` is now a hard 500** (it used to skip the auth check entirely — an endpoint that grants currency must never run unauthenticated); the household lookup moved from `owner_id` to the buyer's **active** household (a non-owner subscriber previously unlocked nothing); premium follows the same path.
- `.env` gains empty `EXPO_PUBLIC_RC_IOS_KEY` / `EXPO_PUBLIC_RC_ANDROID_KEY` — with no key the app stays on the mock, so nothing breaks before the dashboard exists.

**ROLES — the actual hole was a name collision, not a missing check.** The `myRole` gates and the server RPCs were already correct (members genuinely get 42501). But `components/RoleField.tsx` rendered a chip literally labelled **"Admin"** that wrote free-text `members.role` with **no authorisation on either side**, so any member could tick it on their own card — or anyone else's — and read as an admin everywhere while being granted nothing.
- The cosmetic Admin chip is **gone**; `formatMemberRoles` no longer accepts `isAdmin` (`parseMemberRoles` still recognises the legacy value, so old cards drop it on next save). The edit-card sheet now shows the **real** household role as a read-only `RoleBadge`. `isAdminRole` is deleted; `pet/[id]/card.tsx` picks its emergency contact from `state.accounts` roles instead.
- **`0033_member_cards_and_coin_grants.sql`** (NEW, **not applied**) — a `members_write_guard` BEFORE INSERT/UPDATE/DELETE trigger: owner/admin, or your own linked card (no cross-household moves, no self-delete). SECURITY DEFINER RPCs are unaffected (`auth.uid()` is null). Plus the `coin_grants` ledger and `grant_household_coins`.

**"FAMILY WITHOUT THE APP" — removed.** Section, Add-card sheet, "Invite to claim", the target-card chips and the forced single-use rule, all gone from `app/settings/family.tsx`. Editing your OWN card survives (manage sheet → Edit card). `addMember`/`removeMember`/`targetMemberId` plumbing stays in the store and RPCs — `target` is simply always null now, and ripping out the DB layer would break the web demo. Existing unclaimed cards remain and still name their history.

**INVITES.** New **`lib/inviteShare.ts`** owns the payload for both entry points: `Share.share` now passes `url` SEPARATELY from `message` (a custom scheme buried in a text blob usually arrives as dead text) and leads with the human-readable code. **`expo-clipboard` installed** — new `InviteCard` shows the code at 26pt, selectable, with **Copy code** / Share / Revoke; "Create & share code" became "Create invite code" and lands it in that card instead of firing the share sheet blind. The invite entry point moved from a grey `SmallButton` in the section header to a **full-width accent row** under the Family list. Onboarding's invite step got the same treatment.

**JOIN NAMES.** `redeem_invite` names the new card from `raw_user_meta_data->>'name'` **at redeem time**, falling back to "New member" — which is what Google sign-ins got, since (unlike Apple) that flow never backfills a name. `app/join.tsx` now asks for the name up front, prefilled from the session with a `touched` guard, and writes it via `updateUser` **before** redeeming. Applies to the code path and the legacy `?f=` path.

**UI.**
- **Toasts** (`components/Toasts.tsx`) — rewritten as a **single top banner**: slides down under the status bar, tap or swipe-up to dismiss, ~3.4s. Replaces rather than stacks (`toast()` and `undoableDelete` now `setToasts([…])`), which deletes `MAX_VISIBLE`, the "Clear all" pill and `TAB_BAR_CLEARANCE`. The old top position was abandoned because a full-width card blocked the header island — addressed here rather than reverted into: `pointerEvents="box-none"`, one compact row, both gestures dismiss. `notifyRecentActivity` now caps a catch-up batch at 3 toasts (still marking all as seen) with a 2.8s stagger, so a long batch can't become a minutes-long parade.
- **Community** (`app/(tabs)/community/index.tsx`) — two stacked control rows collapsed into one (segmented Questions/Pet care + a quiet sort text-button); Ask/Caregive pills replaced by a **floating compose button** (new optional `overlay` prop on `TabScreen`); the two compose sheets merged into one with a post-type switch for caregivers; `PostCard` rebuilt around a single meta line (breed · author · family · time) above a 17pt title; **skeleton cards** replace the full-page spinner on category/sort switches. Both `TEMP DEBUG` console.logs removed.
- **Pull-to-refresh** — `PushedScreen` now spreads `ScrollViewProps` like `TabScreen`, so `activity`, `reminders`, `coins`, `settings/family`, `pet/[id]` and the post detail all pull-to-refresh. `usePullToRefresh(also?)` takes an optional second source; Community and the post detail use it to refresh the forum AND the household in one gesture (Community's bespoke control never called the store's `refresh()`).
- **"Sex" → "Gender"** everywhere. The TS field is renamed across `lib/data.ts` (incl. ~94 weight/feeding rows), the store and every screen. **The DB column stays `pets.sex`** — it comes from migrations 0001–0014 in the shared web-demo repo — mapped at exactly three boundaries in `lib/store.tsx` (hydrate / insert / update), documented on `PetRow`. The tri-state was also normalised: all three editors now offer Male / Female / Not set (AddPetSheet used to force a binary and default to Female).
- **Settings ▸ Account flash** — `hasPassword` optimistically assumed an email identity existed, so on a Google-only account "Change password" mounted and vanished a tick later (along with the subtitle and the Disconnect buttons). The screen now waits for `identitiesLoaded` before painting; `getUserIdentities()` reads the cached session, so it costs a microtask.

**Migrations 0031 / 0032 / 0033 — APPLIED and verified live 2026-07-26.** All 14 realtime tables are in the `supabase_realtime` publication and all 14 are at `relreplident='f'`; `coin_grants`, `grant_household_coins`, `guard_member_write` + the `members_write_guard` trigger exist. What's left is the two-phone walkthrough below and the RevenueCat dashboard (checklist step 7).

## File map
- `lib/store.tsx` — THE app state (ported web store, now with the multi-household/roles/invites layer). `lib/data.ts` — types + reference data. `lib/theme.ts` — all tokens (useColors()).
- `lib/auth.ts` — THE client auth API (Apple/Google/email sign-in, OTP verify/reset, identity linking). `lib/pendingInvite.ts` — signed-out invite-link stash. `lib/authErrors.ts` — friendly copy.
- `components/` — ui.tsx primitives, Screen.tsx scaffolds, Sheet, Icons, AuthProviderButtons, AddPetSheet (shared Pets tab + onboarding), Paywall, Toasts, NotificationSync, per-feature sheets; `components/pixel/` — sprite engine + Pet3D + PixelChart.
- `app/` — (auth) welcome/login/signup/forgot; (onboarding) index/create/first-pet/invite; (tabs) home/plan/logs/pets/community; pushed: activity, reminders, pet/[id](+card), vets, join, verify, reset-password, auth-callback, settings/{family,account,general,accessibility}. Root `_layout.tsx` holds the Stack.Protected session guards — new root routes MUST be registered there.
- `providers/` — session, purchases. `lib/notifications.ts`, `lib/pushTokens.ts` (now invoked), `lib/a11y.tsx`.
- `supabase/migrations/0015–0030`, `supabase/functions/{delete-account,send-due-reminders,rc-webhook}` (Deno; excluded from app tsconfig/eslint).

## Roadmap
1. **← ACTIVE: owner runs the ACCOUNTS/AUTH setup checklist** (migrations **0017/0018 + 0022–0025 + 0026–0030 applied; 0031 STILL PENDING — invites stay broken until it lands**, Apple/Google providers, redirect URLs, email templates, manual linking — the full checklist is in the 2026-07-25/26 section above) then device-verifies that batch's two-phone walkthrough plus the still-pending 2026-07-23/24 + dark-mode priorities.
2. Web-demo follow-up patches (3 small ones listed in the accounts section) in the webdemo repo.
3. **Make scheduling OPTIONAL** — the last open item from the owner's Phase-8 list:
   "for all the tasks that you schedule, you can also not schedule and just track it normal."
   Plumbing already supports it (`careItemStatus` returns `state:"unscheduled"` with count-based
   `progress` when no schedule exists; `ScheduleEditorSheet` has "Remove schedule") — the work is
   making that path **explicit and discoverable** rather than implicit. Agree the UX with the owner
   first; this system was designed collaboratively.
4. Fix whatever the walkthrough surfaces; visual polish pass on-device.
5. EAS cutover (checklist below), TestFlight, App Store.

## EAS cutover checklist (when the app is ready for real builds)
1. `npm i -g eas-cli && eas login && eas init` (sets `extra.eas.projectId` — unlocks push token registration in `lib/pushTokens.ts`).
2. Apply `supabase/migrations/0015_push_tokens.sql` to the shared project (`supabase migration list` first; verify web demo after).
3. Deploy Edge Functions: `supabase functions deploy delete-account send-due-reminders rc-webhook`; set `CRON_SECRET`, `RC_WEBHOOK_SECRET`; schedule `send-due-reminders` via pg_cron (SQL in the function header). delete-account now REQUIRES migration 0028 applied first (it 409s otherwise, by design).
4. ~~Call `registerPushToken(userId)` after sign-in~~ — DONE 2026-07-26 (`PushTokenRegistrar` in app/_layout.tsx; self-guards until eas init).
5. RevenueCat: create app + `petpal_plus_monthly` product, `npx expo install react-native-purchases`, add `providers/purchases/revenuecat.ts` adapter (select it in `providers/purchases/index.tsx` when `Constants.appOwnership !== "expo"` && `EXPO_PUBLIC_RC_API_KEY` set — file must not exist before this step or Metro bundles it into Expo Go), configure with Supabase user id as app_user_id, wire the dashboard webhook → `rc-webhook`.
6. Native Google Sign-In: add `android.package` to app.json, create native OAuth client IDs (iOS + Android w/ SHA-1), `npx expo install @react-native-google-signin/google-signin`, swap `signInWithGoogle()`'s internals in `lib/auth.ts` to one-tap + `signInWithIdToken` (the SCOPE(EAS cutover) comment marks the spot — UI doesn't change). Add `ios.usesAppleSignIn: true` + the expo-apple-authentication plugin for the build.
7. `eas build --profile development --platform ios` (Apple Developer account required) → dev-build walkthrough → `preview`/`production` builds → TestFlight. Universal links for invite codes (associatedDomains) become possible here if a real domain is chosen.

## Deliberately partial — grows later
| Area | What shipped now | Intended full shape | Grows in |
| --- | --- | --- | --- |
| Purchases | Mock gateway, instant unlock via `households.premium` | RevenueCat adapter + webhook | EAS cutover |
| Notifications | Local scheduling only | Remote push via 0015 + Edge Function | EAS cutover |
| Account deletion | Edge Function now runs successor logic (prepare_account_deletion) before deleteUser; app copy honest until deployed | Live deletion with succession | EAS cutover step 3 (needs 0028 applied) |
| Google sign-in | System-browser OAuth (works in Expo Go; redirect allowlist churn per network) | Native one-tap sheet behind the same lib/auth.ts call | EAS cutover step 6 |
| Sign in with Apple | Native in Expo Go via host.exp.Exponent client id | Same + com.kagu.petpal entitlement in real builds | EAS cutover (plugin + usesAppleSignIn) |
| Invite links | Short codes + petpal:// scheme links (no https origin — owner decision) | Universal https links that open the app | EAS cutover step 7 + owner picks a domain |
| Weight/age inputs | JS `WheelPicker` (iOS clock-style, no native dep) | Fine as-is; native picker optional | — |
| Date/time inputs | Chip/stepper pickers (no native dep) | Consider native datetimepicker in dev build | Post-verify polish |
| A11y prefs | Reduce-motion (pref OR OS) + haptics now consumed | Extend gating to more animated surfaces | Polish |
| Notifications | Local scheduling + immediate local notif on own action | Family-wide remote push (needs notifications table) | EAS cutover |
| Invite web origin | RESOLVED 2026-07-26: placeholder removed — invites are codes + petpal:// links; Family ID share (for the web app) remains as a footnote row | — | — |
| Care schedules | Full UI + local eval; DB table pending (0017 not applied — CLI lacks project access) | Synced family-wide once 0017 runs; later: server push reads care_schedules | Owner runs 0017 (SQL editor or CLI login with project access) |
| Emergency card | Text share only | Print/PDF variant (needs expo-print) | Optional |
| Back button | Custom `HeaderBackButton` (iOS-only headerLeft) — rn-screens 4.16 iOS 26 bug in Expo Go | Real system chevron | EAS cutover (pin fixed rn-screens, remove SCOPE(EAS cutover) block in Screen.tsx) |
| Streak bonus | +20 coins per 10-day milestone, mobile-only | Web demo adopts `last_streak_bonus` too | Web-demo change (owner) |
| Duplicate reminders | Insert-time dedupe + render belt-and-braces; old rows purge in 0023 | Clean table once 0023 applied | Owner runs 0023 |

## Gotchas

### ⚠️ Reanimated worklets — the silent-crash rule (READ BEFORE WRITING ANY ANIMATION)

**A worklet must never close over a plain JS value that changes, and must never call a JS
function.** Violating this crashes the app with **no red screen and nothing in the Metro log** —
Expo Go just disappears. This cost two full debugging sessions (2026-07-20); don't rediscover it.

**Why it's silent:** an uncaught error on the JS thread is a red screen. On the **UI (worklet)
thread there is no handler** — it propagates into C++, hits `__cxa_throw` with nothing to catch it,
and calls `abort()`. `SIGABRT`, process gone, log empty.

**The signature in an iOS crash report** (Settings › Privacy & Security › Analytics Data ›
`Expo Go-…`) — if you see these two together, it is this bug:
```
Thread 0 (main):  worklets::UIScheduler::triggerUI()
                    → HermesRuntimeImpl::call → throwPendingError() → __cxa_throw → abort()
Thread N (JS):    "(Data Abort) byte write Translation fault", far: 0x0   ← null write
                    → HermesValue32::encodeHermesValue → JSObject::addOwnProperty
                    → putComputedWithReceiver_RJS → Runtime::drainJobs()  ← a promise resolving
```
Both threads inside Hermes at once = a JS-thread promise mutating objects while the UI thread
re-serializes a worklet closure. **It reproduces on DB fetch** because that's when a promise
resolution coincides with layout/state changes feeding an animation.

**Rules:**
1. **Mirror JS values into shared values.** Anything a worklet reads that can change — a measured
   width, a list length, a flag — goes through `useSharedValue` + a `useEffect` that assigns it.
   Never read the render-scope variable directly.
2. **No JS function calls inside a worklet.** Precompute at module scope. `withAlpha(...)` inside
   `useAnimatedStyle` was a real instance of this (in `PetDot`) — hoisted to a `DOT_RANGE` const.
3. **Mark them: `"worklet";`** as the first line of every animated callback, so a capture that
   can't be serialized fails at build time instead of aborting at runtime.
4. **Guard every `runOnJS` in an animation callback** with an `alive` shared value set false on
   unmount, and `cancelAnimation(sv)` in the cleanup. (Separate, also-real bug — see `d1de0cc`,
   where an unguarded `requestAnimationFrame` → `scrollTo` on a torn-down `ScrollView` in
   `WheelPicker` caused the same silent close.)

The canonical correct example is the Home hero carousel (`app/(tabs)/home/index.tsx`): `heroWSV` /
`lastIndexSV` mirrors, `DOT_RANGE` hoisted, `alive` guard, `"worklet"` on every callback. Copy that
shape. **When an animation crashes silently, get the crash report first — do not guess from the
source.** Guessing failed three times running; the stack trace identified it in one pass.

### Everything else
- **Web demo is production truth**: never rename/drop/retighten schema it queries; new migrations start at 0015 (no 0008 upstream). Each of 0026–0030 carries its own WEB-DEMO COMPAT note — read it before touching them.
- **`household_members.member_id` has DUAL semantics**: mobile treats it as the account's claimed-card link; the web demo persists its "view as" pointer into the same column. Deliberately NO unique index on it; the 0026 claimed-card guard only counts OTHER users' pointers as claims. Don't "fix" one side without the other.
- **New root-level route files ship UNGUARDED unless registered** inside the signed-in `Stack.Protected` block in `app/_layout.tsx` (`/verify` + `/reset-password` are unguarded on purpose — OTP creates the session mid-screen).
- Expo Go: never install `react-native-purchases` before the cutover step; typed-route regeneration only happens on `expo start` (NOT `export`) — if a new route 404s in types, boot the dev server once (kill stale ports first: a port-conflict boot dies before regenerating).
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
