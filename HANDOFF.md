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

## File map
- `lib/store.tsx` — THE app state (ported web store). Stable; don't modify for UI work. `lib/data.ts` — types + reference data (verbatim web copy). `lib/theme.ts` — all tokens.
- `components/` — ui.tsx primitives, Screen.tsx scaffolds, Sheet, Icons, Paywall, Toasts, NotificationSync, per-feature sheets; `components/pixel/` — sprite engine + data + Pet3D + PixelChart.
- `app/` — (auth) login/signup; (tabs) index/plan/logs/pets/settings; pushed: activity, reminders, pet/[id](+card), vets, join, settings/{family,account,general,accessibility}.
- `providers/` — session, purchases. `lib/notifications.ts`, `lib/pushTokens.ts`, `lib/a11y.tsx`.
- `supabase/migrations/0015_push_tokens.sql`, `supabase/functions/{delete-account,send-due-reminders,rc-webhook}` (Deno; excluded from app tsconfig/eslint).

## Roadmap
1. **← ACTIVE: owner device-verifies the 2026-07-23 bug-fix batch** (priorities listed at the end of that batch's section) and applies migrations **0022–0024** (plus 0017/0018 still pending) in the Supabase SQL editor.
2. Two-account household audit on-device (invite → join → switch) — code fixes landed, flow untested.
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
