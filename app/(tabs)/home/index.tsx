import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import EmptyState from "@/components/EmptyState";
import EditStatSheet from "@/components/EditStatSheet";
import HeaderActions from "@/components/HeaderActions";
import HighlightsSection from "@/components/HighlightsSection";
import PetAvatar from "@/components/PetAvatar";
import { TabScreen } from "@/components/Screen";
import Sheet from "@/components/Sheet";
import ShortcutsSection from "@/components/ShortcutsSection";
import StreakCalendarSheet from "@/components/StreakCalendarSheet";
import Welcome from "@/components/Welcome";
import { Icon } from "@/components/Icons";
import { Chevron, Chip, Group, IconCircle, PressableScale, PRESS_SCALE_SMALL, Row, SectionHeader, SheetTitle } from "@/components/ui";
import { formatAge, formatWeight, kgToUnit, unitToKg, weightUnitLabel } from "@/lib/data";
import { effectiveDailyTarget } from "@/lib/careStatus";
import { useReduceMotion } from "@/lib/a11y";
import { dueLabel, useStore } from "@/lib/store";
import { cardShadow, colors, font, radius, withAlpha } from "@/lib/theme";
import { usePullToRefresh } from "@/lib/useRefresh";

/** Compact day-streak pill for the Home header (flame + count). */
function StreakPill({ streak, onPress }: { streak: number; onPress: () => void }) {
  return (
    <PressableScale
      haptic
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${streak} day streak`}
    >
      <View style={styles.streakPill}>
        <Icon name="flame" size={14} color={colors.orange} />
        <Text style={styles.streakPillLabel}>{streak}</Text>
      </View>
    </PressableScale>
  );
}

const DOT_SIZE = 8;
const DOT_ACTIVE_W = 22;
// Precomputed OUTSIDE the worklet. Calling withAlpha() inside useAnimatedStyle
// would run a JS function on the UI thread every frame, per dot.
const DOT_RANGE: readonly [string, string] = [withAlpha(colors.label, 0.18), colors.label];

/**
 * One page dot, driven by the carousel's live track value so it stretches and
 * darkens continuously as the finger moves — not in a jump after the swipe
 * lands. At track === index the dot is the wide "active" pill; a slide away it
 * is a small faint circle, and it interpolates between the two.
 */
function PetDot({ index, track, onPress, label }: { index: number; track: SharedValue<number>; onPress: () => void; label: string }) {
  const style = useAnimatedStyle(() => {
    "worklet";
    // 1 when this dot's page is centered, 0 when a full slide away or more.
    const nearness = Math.max(0, 1 - Math.abs(track.value - index));
    return {
      width: DOT_SIZE + (DOT_ACTIVE_W - DOT_SIZE) * nearness,
      backgroundColor: interpolateColor(nearness, [0, 1], DOT_RANGE as unknown as string[]),
    };
  });
  return (
    <PressableScale scaleTo={PRESS_SCALE_SMALL} onPress={onPress} accessibilityLabel={label} hitSlop={10}>
      <Animated.View style={[styles.petDot, style]} />
    </PressableScale>
  );
}

/** Animated "meals today" progress bar. */
function MealsBar({ pct }: { pct: number }) {
  const [barW, setBarW] = useState(0);
  const progress = useSharedValue(0);
  // One MealsBar renders per carousel slide, and slides mount/unmount as the
  // hero frame measures — cancel so no tween outlives its view.
  useEffect(() => {
    progress.value = withTiming(pct, { duration: 250, easing: Easing.out(Easing.quad) });
    return () => cancelAnimation(progress);
  }, [pct, progress]);
  const fillStyle = useAnimatedStyle(() => ({ width: (barW * progress.value) / 100 }));
  return (
    <View style={styles.barTrack} onLayout={(e) => setBarW(e.nativeEvent.layout.width)}>
      <Animated.View style={[styles.barFill, { backgroundColor: pct >= 100 ? colors.green : colors.accent }, fillStyle]} />
    </View>
  );
}

export default function Home() {
  const { state, hydrated, addWeight, editPet, toast } = useStore();
  const router = useRouter();
  const refreshControl = usePullToRefresh();
  const [petIndex, setPetIndex] = useState(0);
  const [editingStat, setEditingStat] = useState<"weight" | "age" | null>(null);
  const [petPickerOpen, setPetPickerOpen] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);

  // Hero carousel. The card itself is a fixed frame that never moves; inside it
  // a track holding every pet slides horizontally, so one pet pushes the next
  // one out of the way. No fading — pure translation, like a paged scroller.
  //
  // `track` is measured in slides: 0 = first pet centered, 1 = second, and
  // fractional values while a finger is dragging.
  const reduceMotion = useReduceMotion();
  const [heroW, setHeroW] = useState(0);
  const track = useSharedValue(0);
  const dragStart = useSharedValue(0);
  // heroW and lastIndex are MIRRORED into shared values rather than captured
  // from the render closure. A worklet that closes over a plain JS number has to
  // be re-created and re-serialized across the JS/UI thread boundary every time
  // that number changes — and both of these change at exactly the moment the
  // Supabase fetch resolves (layout measures, state.pets fills in). Doing that
  // while a promise continuation is mutating JS objects is what aborted the
  // process: the crash report shows a null write in Hermes' property store on
  // the JS thread and a worklet throwing on the UI thread, simultaneously.
  // Shared values are owned by the UI thread, so reading them costs no capture.
  const heroWSV = useSharedValue(0);
  const lastIndexSV = useSharedValue(0);
  const trackStyle = useAnimatedStyle(() => {
    "worklet";
    return { transform: [{ translateX: -track.value * heroWSV.value }] };
  });

  // Guards every animation completion callback that hops back to JS. A timing
  // animation started here can still be running when Home unmounts or swaps
  // render path (it mounts unhydrated, returns the empty state, then re-renders
  // once Supabase data lands) — and a runOnJS callback that fires against a
  // torn-down component is a native crash, not a catchable JS error, so the app
  // just closes with nothing in the Metro log. Same failure class as the
  // WheelPicker scrollTo fix in d1de0cc.
  const alive = useSharedValue(true);
  useEffect(() => {
    alive.value = true;
    return () => {
      alive.value = false;
      // Stop anything mid-flight so its callback can never run post-unmount.
      cancelAnimation(track);
    };
  }, [alive, track]);

  // Keep the UI-thread mirrors in step with the JS-side values. Reduce-motion
  // is folded into heroW: zero disables the gesture entirely, which is exactly
  // the reduced-motion behavior (no finger tracking, instant index swap).
  useEffect(() => {
    heroWSV.value = reduceMotion ? 0 : heroW;
  }, [heroW, reduceMotion, heroWSV]);

  useEffect(() => {
    lastIndexSV.value = Math.max(0, state.pets.length - 1);
  }, [state.pets.length, lastIndexSV]);

  // Keep the track aligned when the index changes from outside the gesture
  // (the dots, a pet being deleted, the switch-pet sheet).
  //
  // Skips animating until the frame is measured: before that the track renders
  // a single full-width slide, so tweening toward a multi-slide offset would
  // animate against a width that is about to change.
  useEffect(() => {
    if (reduceMotion || heroW === 0) {
      track.value = petIndex;
      return;
    }
    track.value = withTiming(petIndex, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [petIndex, reduceMotion, heroW, track]);

  // Deleting the pet you're viewing (or any earlier one) leaves petIndex past
  // the end of the list; without this the hero silently swaps to a different
  // pet while every derived count keeps pointing at the old index.
  const petCount = state.pets.length;
  useEffect(() => {
    setPetIndex((i) => (i > petCount - 1 ? Math.max(0, petCount - 1) : i));
  }, [petCount]);

  const pet = state.pets[Math.min(petIndex, state.pets.length - 1)] as (typeof state.pets)[number] | undefined;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Horizontal swipe on the hero card pages between pets, like the web's
  // pointer swipe. activeOffsetX keeps taps and vertical scrolls untouched.
  //
  // The threshold is deliberately generous (25, not 15): this Pan wraps the
  // whole hero, including the small chips and the 7pt pet dots, and a tap that
  // drifts past the threshold cancels the press instead of firing it. Small
  // targets attract exactly that kind of imprecise tap.
  // Every worklet below reads ONLY shared values and its own event argument —
  // no captured JS state — so the gesture object never needs rebuilding when
  // the pet list or the measured width changes.
  const swipe = Gesture.Pan()
    .activeOffsetX([-25, 25])
    .failOffsetY([-12, 12])
    .onBegin(() => {
      "worklet";
      dragStart.value = track.value;
    })
    .onUpdate((e) => {
      "worklet";
      const w = heroWSV.value;
      if (w === 0) return;
      const last = lastIndexSV.value;
      let next = dragStart.value - e.translationX / w;
      // Rubber-band past the ends instead of letting the track run off.
      if (next < 0) next = next * 0.3;
      else if (next > last) next = last + (next - last) * 0.3;
      track.value = next;
    })
    .onEnd((e) => {
      "worklet";
      const w = heroWSV.value;
      if (w === 0) return;
      const last = lastIndexSV.value;
      // Decide the target slide from where the drag ended plus its velocity, so
      // a quick flick pages even when it didn't travel far.
      const projected = track.value - (e.velocityX / w) * 0.15;
      const target = Math.max(0, Math.min(last, Math.round(projected)));
      track.value = withTiming(target, { duration: 280, easing: Easing.out(Easing.cubic) }, (done) => {
        "worklet";
        // Commit the index once the slide lands — the rest of the page (meals
        // bar, reminders) reads off petIndex, so flipping it mid-flight would
        // swap content under the moving track. `alive` gates the hop back to
        // JS: without it an unmount during the 280ms slide crashes natively.
        if (done && alive.value) runOnJS(setPetIndex)(target);
      });
    });

  if (!hydrated || !pet) {
    return (
      <TabScreen title="Home" trailing={<HeaderActions showCoins />} refreshControl={refreshControl}>
        {hydrated ? (
          <View style={{ marginTop: 16 }}>
            <EmptyState
              icon="paw"
              title="No pets yet"
              body="Add your first pet to start tracking their care together."
              cta="Add a pet"
              onCta={() => router.push("/pets")}
            />
          </View>
        ) : (
          <View style={styles.loadingWrap}>
            <Text style={styles.loadingText}>Loading your household…</Text>
          </View>
        )}
        <Welcome />
      </TabScreen>
    );
  }

  const me = state.members.find((m) => m.id === state.currentMemberId);
  // Meals for ANY pet — every slide in the carousel renders its own bar, so this
  // can't be derived from the selected pet alone.
  //
  // The pet's feeding schedule (when set on the Logs tab) is the source of
  // truth for meals per day; otherwise the canonical daily target (breed plan
  // → species default) so a plan-less cat targets 3 meals, not a hardcoded 2.
  const mealsFor = (p: (typeof state.pets)[number]) => {
    const target = effectiveDailyTarget(p, "fed", state.schedules) ?? 2;
    const count = state.activities.filter(
      (a) => a.petId === p.id && a.type === "fed" && a.ts >= startOfDay.getTime()
    ).length;
    return { target, count, pct: Math.min(100, Math.round((count / target) * 100)) };
  };

  // Household-wide outstanding alerts, deduped by pet+title (the data can hold
  // duplicates) — Home shows one calm summary line, the details live on /activity.
  const alertCount = new Set(state.reminders.filter((r) => r.alert && !r.done).map((r) => `${r.petId}|${r.title}`)).size;

  // Reminders are household-wide, NOT scoped to the pet in the hero — every
  // pet's next few items share one list, each row tagged with whose it is.
  const upcomingReminders = state.reminders.filter((r) => !r.done).sort((a, b) => a.due - b.due).slice(0, 3);

  const hour = new Date().getHours();
  const greeting = `Good ${hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"}, ${me?.name}`;

  const multiPet = state.pets.length > 1;

  return (
    <TabScreen
      title="Home"
      subtitle={greeting}
      // The streak pill goes INSIDE the island (not beside it) — a fragment of
      // siblings in `headerRight` leaves only one of them tappable. See
      // components/HeaderActions.tsx.
      trailing={<HeaderActions showCoins leading={<StreakPill streak={state.streak} onPress={() => setStreakOpen(true)} />} />}
      refreshControl={refreshControl}
    >
      {/* Pet hero — a FIXED card frame; the pets themselves ride a track that
          slides inside it, so one pet pushes the next out of the way. */}
      <View style={styles.hero} onLayout={(e) => setHeroW(e.nativeEvent.layout.width)}>
        <GestureDetector gesture={swipe}>
          <View style={styles.heroViewport}>
            {/* Before the frame is measured, render ONLY the current pet at full
                width. Rendering every slide with an undefined width lays them
                out side by side at content width, which overflows the frame and
                thrashes layout on the first pass. */}
            <Animated.View style={[styles.heroTrack, trackStyle]}>
              {(heroW === 0 ? [pet] : state.pets).map((p) => (
                <View key={p.id} style={[styles.heroSlide, heroW === 0 ? styles.heroSlideFull : { width: heroW }]}>
                  <View style={styles.heroTop}>
                    <PressableScale
                      onPress={() => router.push(`/pet/${p.id}`)}
                      accessibilityLabel={`Open ${p.name}'s details`}
                      hitSlop={6}
                    >
                      <PetAvatar pet={p} size="lg" idle />
                    </PressableScale>
                    {/* Visible switch affordance next to the swipe gesture: the
                        name row opens the same switch-pet sheet other tabs use. */}
                    <PressableScale
                      scaleTo={0.99}
                      onPress={() => (multiPet ? setPetPickerOpen(true) : router.push(`/pet/${p.id}`))}
                      accessibilityLabel={multiPet ? "Switch pet" : `Open ${p.name}'s details`}
                      style={styles.heroText}
                    >
                      <View style={styles.heroTextInner}>
                        <View style={styles.heroNameRow}>
                          <Text numberOfLines={1} style={styles.heroName}>
                            {p.name}
                          </Text>
                          {/* Points down, not right: this row opens a sheet
                              below rather than pushing a screen. The 2px drop
                              centers it on the letters: Inter's ascender is far
                              taller than its x-height, so the text line box's
                              center sits ~2px above the middle of the glyphs. */}
                          <View style={styles.heroNameChevron}>
                            <Icon name="chevron-down" size={15} color={colors.label3} strokeWidth={3} />
                          </View>
                        </View>
                        <Text numberOfLines={1} style={styles.heroBreed}>
                          {p.breed}
                        </Text>
                      </View>
                    </PressableScale>
                  </View>

                  <View style={styles.chipsRow}>
                    <PressableScale
                      scaleTo={PRESS_SCALE_SMALL}
                      onPress={() => setEditingStat("age")}
                      accessibilityLabel="Edit age"
                      hitSlop={10}
                    >
                      <Chip>
                        <Text style={styles.chipText}>{formatAge(p.ageYears)}</Text>
                        <Icon name="chevron-right" size={9} color={colors.label3} />
                      </Chip>
                    </PressableScale>
                    <PressableScale
                      scaleTo={PRESS_SCALE_SMALL}
                      onPress={() => setEditingStat("weight")}
                      accessibilityLabel="Edit weight"
                      hitSlop={10}
                    >
                      <Chip>
                        <Text style={styles.chipText}>{formatWeight(p.weightKg, state.units)}</Text>
                        <Icon name="chevron-right" size={9} color={colors.label3} />
                      </Chip>
                    </PressableScale>
                  </View>

                  <View style={{ marginTop: 16 }}>
                    <View style={styles.mealsRow}>
                      <Text style={styles.mealsLabel}>Meals today</Text>
                      <Text style={styles.mealsCount}>
                        {mealsFor(p).count} <Text style={{ color: colors.label3 }}>of {mealsFor(p).target}</Text>
                      </Text>
                    </View>
                    <MealsBar pct={mealsFor(p).pct} />
                  </View>
                </View>
              ))}
            </Animated.View>
          </View>
        </GestureDetector>

        {/* Dots sit OUTSIDE the viewport — part of the fixed frame, not the slide. */}
        {multiPet && (
          <>
            <View style={styles.dotsRow}>
              {state.pets.map((p, i) => (
                <PetDot key={p.id} index={i} track={track} onPress={() => setPetIndex(i)} label={`Show ${p.name}`} />
              ))}
            </View>
            {/* Dots alone were too subtle a cue — say it in words too, so
                nobody thinks the household has one pet. Plain JS render off
                petIndex; deliberately NOT driven by the live track value (no
                worklet, no re-serialization risk — see the crash-rule note). */}
            <Text style={styles.heroCount}>
              swipe to switch · {petIndex + 1} of {petCount} pets
            </Text>
          </>
        )}
      </View>

      {/* One calm entry point for everything that needs attention */}
      {alertCount > 0 && (
        <PressableScale onPress={() => router.push("/activity")} accessibilityRole="button" style={{ marginTop: 12 }}>
          <View style={styles.alertBanner}>
            <View style={styles.alertIcon}>
              <Icon name="bell" size={16} color={colors.white} />
            </View>
            <Text style={styles.alertLabel}>
              {alertCount} thing{alertCount === 1 ? "" : "s"} need{alertCount === 1 ? "s" : ""} attention
            </Text>
            <Icon name="chevron-right" size={15} color={withAlpha(colors.red, 0.7)} />
          </View>
        </PressableScale>
      )}

      {/* One-tap logging for the things this family does every day */}
      <ShortcutsSection />

      {/* Collective supply levels — what needs buying next */}
      <HighlightsSection />

      {/* Every pet's next reminders, each tagged with whose it is */}
      <SectionHeader
        trailing={
          <PressableScale
            scaleTo={PRESS_SCALE_SMALL}
            onPress={() => router.push("/reminders")}
            accessibilityRole="button"
            accessibilityLabel="See all reminders"
            hitSlop={10}
          >
            <Text style={styles.seeAll}>See all</Text>
          </PressableScale>
        }
      >
        Reminders
      </SectionHeader>
      <Group>
        {upcomingReminders.length > 0 ? (
          upcomingReminders.map((r) => {
            const rPet = state.pets.find((p) => p.id === r.petId);
            const overdue = dueLabel(r.due) === "overdue";
            return (
              <Row
                key={r.id}
                onPress={() => router.push("/reminders")}
                leading={
                  rPet ? (
                    <PetAvatar pet={rPet} size="sm" showCosmetics={false} />
                  ) : (
                    <IconCircle icon="clock" tint={colors.accent} bg={colors.accentSoft} size={40} />
                  )
                }
                title={
                  <Text numberOfLines={1} style={[styles.reminderTitle, r.alert ? { color: colors.red } : null]}>
                    {r.title}
                  </Text>
                }
                subtitle={
                  <View style={styles.reminderTagRow}>
                    {rPet ? (
                      <View style={styles.petTag}>
                        <Text numberOfLines={1} style={styles.petTagLabel}>
                          {rPet.name}
                        </Text>
                      </View>
                    ) : null}
                    <Text numberOfLines={1} style={[styles.reminderDue, overdue ? { color: colors.red } : null]}>
                      {overdue ? "overdue" : `due ${dueLabel(r.due)}`}
                    </Text>
                  </View>
                }
                trailing={<Chevron />}
              />
            );
          })
        ) : (
          <Row
            onPress={() => router.push("/reminders")}
            leading={<IconCircle icon="clock" tint={colors.accent} bg={colors.accentSoft} size={40} />}
            title="No upcoming reminders"
            subtitle="Tap to add one for the family"
            trailing={<Chevron />}
          />
        )}
      </Group>

      {/* Switch pet */}
      <Sheet open={petPickerOpen} onClose={() => setPetPickerOpen(false)}>
        <View style={{ marginBottom: 12 }}>
          <SheetTitle>Switch pet</SheetTitle>
        </View>
        <Group>
          {state.pets.map((p, i) => (
            <Row
              key={p.id}
              onPress={() => {
                setPetIndex(i);
                setPetPickerOpen(false);
              }}
              leading={<PetAvatar pet={p} size="sm" />}
              title={p.name}
              subtitle={p.breed}
              trailing={p.id === pet.id ? <Icon name="check" size={18} color={colors.accent} /> : undefined}
            />
          ))}
        </Group>
      </Sheet>

      <EditStatSheet
        open={editingStat === "weight"}
        onClose={() => setEditingStat(null)}
        title={`${pet.name}'s weight`}
        label={`Weight (${weightUnitLabel(state.units)})`}
        min={0.1}
        max={state.units === "lb" ? 260 : 120}
        unit={weightUnitLabel(state.units)}
        initialValue={kgToUnit(pet.weightKg, state.units)}
        onSave={(v) => {
          const kg = unitToKg(v, state.units);
          addWeight(pet.id, kg);
          toast("scale", `${pet.name}'s weight updated`, formatWeight(kg, state.units));
        }}
      />
      <EditStatSheet
        open={editingStat === "age"}
        onClose={() => setEditingStat(null)}
        title={`${pet.name}'s age`}
        label="Age (years)"
        min={0}
        max={30}
        unit="yr"
        initialValue={pet.ageYears}
        onSave={(ageYears) => {
          // Typing an age switches the pet back to approximate-age mode — a
          // stored birth date would otherwise silently win on next load.
          editPet(pet.id, {
            name: pet.name,
            breed: pet.breed,
            ageYears,
            weightKg: pet.weightKg,
            cupGrams: pet.cupGrams,
            ...(pet.birthDate != null ? { birthDate: null } : {}),
          });
          toast("calendar", `${pet.name}'s age updated`, formatAge(ageYears));
        }}
      />

      <StreakCalendarSheet open={streakOpen} onClose={() => setStreakOpen(false)} />

      <Welcome />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  seeAll: { fontSize: 14, fontFamily: font.semibold, color: colors.accent },
  reminderTitle: { fontSize: 16, fontFamily: font.medium, color: colors.label },
  reminderTagRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  // The per-pet tag: a compact chip so a household-wide list still reads as
  // "whose is this?" at a glance.
  petTag: {
    maxWidth: 120,
    borderRadius: radius.full,
    backgroundColor: colors.fill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  petTagLabel: { fontSize: 11.5, fontFamily: font.semibold, color: colors.label2 },
  reminderDue: { fontSize: 13, fontFamily: font.regular, color: colors.label2, flexShrink: 1 },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.orangeSoft,
  },
  streakPillLabel: { fontSize: 14, fontFamily: font.bold, color: colors.orange },
  loadingWrap: { marginTop: 40, alignItems: "center" },
  loadingText: { fontSize: 14, fontFamily: font.regular, color: colors.label2, textAlign: "center" },
  // The frame is fixed and clips the sliding track. Padding lives on each slide
  // (not here) so the track spans the full card width and a pet slides edge to
  // edge instead of stopping inside the padding.
  // marginTop gives the hero card a little breathing room below the greeting /
  // header so it doesn't crowd the title the moment the page opens.
  hero: { marginTop: 10, borderRadius: radius.lg, backgroundColor: colors.card, paddingBottom: 10, overflow: "hidden", ...cardShadow },
  heroViewport: { overflow: "hidden" },
  heroTrack: { flexDirection: "row" },
  heroSlide: { paddingHorizontal: 20, paddingTop: 28 },
  // Pre-measurement: fill the frame instead of sizing to content.
  heroSlideFull: { width: "100%" },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 16 },
  heroText: { flex: 1, minWidth: 0 },
  heroTextInner: { minHeight: 44, justifyContent: "center" },
  heroNameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  heroNameChevron: { marginTop: 2 },
  heroName: { fontSize: 22, fontFamily: font.bold, letterSpacing: -0.3, color: colors.label, flexShrink: 1 },
  heroBreed: { fontSize: 14, fontFamily: font.medium, color: colors.label2 },
  chipsRow: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chipText: { fontSize: 12, fontFamily: font.medium, color: colors.label2 },
  mealsRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  mealsLabel: { fontSize: 13, fontFamily: font.semibold, color: colors.label2 },
  mealsCount: { fontSize: 13, fontFamily: font.semibold, color: colors.label },
  barTrack: { marginTop: 6, height: 6, borderRadius: 3, backgroundColor: colors.fill, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
  dotsRow: { marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  heroCount: { marginTop: 8, textAlign: "center", fontSize: 12, fontFamily: font.medium, color: colors.label3 },
  // Width/color are animated by PetDot; this carries the constant geometry.
  petDot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2 },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.md,
    backgroundColor: colors.redSoft,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  alertIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.red, alignItems: "center", justifyContent: "center" },
  alertLabel: { flex: 1, minWidth: 0, fontSize: 15, fontFamily: font.semibold, color: colors.red },
});
