import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
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
import PetAvatar from "@/components/PetAvatar";
import { TabScreen } from "@/components/Screen";
import Sheet from "@/components/Sheet";
import StreakCalendarSheet from "@/components/StreakCalendarSheet";
import Welcome from "@/components/Welcome";
import { Icon } from "@/components/Icons";
import { Chevron, Chip, ConfirmRow, Group, PressableScale, PRESS_SCALE_SMALL, Row, SectionHeader, SheetTitle } from "@/components/ui";
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

const DOT_SIZE = 7;
const DOT_ACTIVE_W = 20;

/**
 * One page dot, driven by the carousel's live track value so it stretches and
 * darkens continuously as the finger moves — not in a jump after the swipe
 * lands. At track === index the dot is the wide "active" pill; a slide away it
 * is a small faint circle, and it interpolates between the two.
 */
function PetDot({ index, track, onPress, label }: { index: number; track: SharedValue<number>; onPress: () => void; label: string }) {
  const style = useAnimatedStyle(() => {
    // 1 when this dot's page is centered, 0 when a full slide away or more.
    const nearness = Math.max(0, 1 - Math.abs(track.value - index));
    return {
      width: DOT_SIZE + (DOT_ACTIVE_W - DOT_SIZE) * nearness,
      backgroundColor: interpolateColor(nearness, [0, 1], [withAlpha(colors.label, 0.18), colors.label]),
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
  useEffect(() => {
    progress.value = withTiming(pct, { duration: 250, easing: Easing.out(Easing.quad) });
  }, [pct, progress]);
  const fillStyle = useAnimatedStyle(() => ({ width: (barW * progress.value) / 100 }));
  return (
    <View style={styles.barTrack} onLayout={(e) => setBarW(e.nativeEvent.layout.width)}>
      <Animated.View style={[styles.barFill, { backgroundColor: pct >= 100 ? colors.green : colors.accent }, fillStyle]} />
    </View>
  );
}

export default function Home() {
  const { state, hydrated, addWeight, editPet, toast, clearOverdueReminders } = useStore();
  const router = useRouter();
  const refreshControl = usePullToRefresh();
  const [petIndex, setPetIndex] = useState(0);
  const [editingStat, setEditingStat] = useState<"weight" | "age" | null>(null);
  const [petPickerOpen, setPetPickerOpen] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [expandedReminderId, setExpandedReminderId] = useState<string | null>(null);

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
  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -track.value * heroW }],
  }));

  // Keep the track aligned when the index changes from outside the gesture
  // (the dots, a pet being deleted, the switch-pet sheet).
  useEffect(() => {
    if (reduceMotion) {
      track.value = petIndex;
      return;
    }
    track.value = withTiming(petIndex, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [petIndex, reduceMotion, track]);

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
  const lastIndex = Math.max(0, state.pets.length - 1);
  const swipe = Gesture.Pan()
    .activeOffsetX([-25, 25])
    .failOffsetY([-12, 12])
    .onBegin(() => {
      dragStart.value = track.value;
    })
    .onUpdate((e) => {
      if (reduceMotion || heroW === 0) return;
      let next = dragStart.value - e.translationX / heroW;
      // Rubber-band past the ends instead of letting the track run off.
      if (next < 0) next = next * 0.3;
      else if (next > lastIndex) next = lastIndex + (next - lastIndex) * 0.3;
      track.value = next;
    })
    .onEnd((e) => {
      if (reduceMotion || heroW === 0) return;
      // Decide the target slide from where the drag ended plus its velocity, so
      // a quick flick pages even when it didn't travel far.
      const projected = track.value - (e.velocityX / heroW) * 0.15;
      const target = Math.max(0, Math.min(lastIndex, Math.round(projected)));
      track.value = withTiming(target, { duration: 280, easing: Easing.out(Easing.cubic) }, (done) => {
        // Commit the index once the slide lands — the rest of the page (meals
        // bar, reminders) reads off petIndex, so flipping it mid-flight would
        // swap content under the moving track.
        if (done) runOnJS(setPetIndex)(target);
      });
    });

  if (!hydrated || !pet) {
    return (
      <TabScreen title="Home" trailing={<HeaderActions />} refreshControl={refreshControl}>
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

  const nextReminder = state.reminders.filter((r) => !r.done && r.petId === pet.id).sort((a, b) => a.due - b.due)[0];
  const overdueReminders = state.reminders.filter((r) => !r.done && r.due < Date.now()).sort((a, b) => a.due - b.due);

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
      trailing={<HeaderActions leading={<StreakPill streak={state.streak} onPress={() => setStreakOpen(true)} />} />}
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
                          <Chevron />
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
          <View style={styles.dotsRow}>
            {state.pets.map((p, i) => (
              <PetDot key={p.id} index={i} track={track} onPress={() => setPetIndex(i)} label={`Show ${p.name}`} />
            ))}
          </View>
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

      {/* Next up */}
      <SectionHeader style={{ marginTop: 32 }}>Reminders</SectionHeader>
      <Group>
        <Row
          onPress={() => setRemindersOpen(true)}
          leading={
            <View style={styles.nextUpIcon}>
              <Icon name="clock" size={19} color={colors.accent} />
            </View>
          }
          title={nextReminder ? nextReminder.title : "No upcoming reminders"}
          subtitle={
            nextReminder
              ? `${pet.name} · ${dueLabel(nextReminder.due) === "overdue" ? "overdue" : `due ${dueLabel(nextReminder.due)}`}`
              : "Tap to add one for the family"
          }
          trailing={<Chevron />}
        />
      </Group>

      {/* Reminders overview: past-due items + a one-tap bulk clear */}
      <Sheet open={remindersOpen} onClose={() => setRemindersOpen(false)}>
        <View style={{ marginBottom: 12 }}>
          <SheetTitle>Reminders</SheetTitle>
        </View>
        {overdueReminders.length > 0 ? (
          <Group>
            {overdueReminders.map((r) => {
              const expanded = expandedReminderId === r.id;
              return (
                <Row
                  key={r.id}
                  title={
                    <Text numberOfLines={expanded ? undefined : 1} style={styles.remindersRowTitle}>
                      {r.title}
                    </Text>
                  }
                  subtitle={
                    <Text numberOfLines={expanded ? undefined : 1} style={styles.remindersRowSubtitle}>
                      {state.pets.find((p) => p.id === r.petId)?.name}
                    </Text>
                  }
                  onPress={() => setExpandedReminderId(expanded ? null : r.id)}
                />
              );
            })}
          </Group>
        ) : (
          <Text style={styles.remindersEmpty}>No past-due reminders.</Text>
        )}
        {overdueReminders.length > 0 && (
          <Group style={{ marginTop: 16 }}>
            <ConfirmRow
              label="Clear all"
              confirmLabel="Tap again to clear all"
              onConfirm={() => {
                clearOverdueReminders();
                setRemindersOpen(false);
              }}
            />
          </Group>
        )}
      </Sheet>

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
  remindersEmpty: { fontSize: 15, fontFamily: font.regular, color: colors.label2, paddingHorizontal: 4, paddingVertical: 8 },
  remindersRowTitle: { fontSize: 16, fontFamily: font.medium, color: colors.label },
  remindersRowSubtitle: { fontSize: 13, fontFamily: font.regular, color: colors.label2, marginTop: 1 },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.orangeSoft,
  },
  streakPillLabel: { fontSize: 14, fontFamily: font.bold, color: colors.orange },
  loadingWrap: { marginTop: 40, alignItems: "center" },
  loadingText: { fontSize: 14, fontFamily: font.regular, color: colors.label2, textAlign: "center" },
  // The frame is fixed and clips the sliding track. Padding lives on each slide
  // (not here) so the track spans the full card width and a pet slides edge to
  // edge instead of stopping inside the padding.
  hero: { borderRadius: radius.lg, backgroundColor: colors.card, paddingBottom: 20, overflow: "hidden", ...cardShadow },
  heroViewport: { overflow: "hidden" },
  heroTrack: { flexDirection: "row" },
  heroSlide: { paddingHorizontal: 20, paddingTop: 20 },
  // Pre-measurement: fill the frame instead of sizing to content.
  heroSlideFull: { width: "100%" },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 16 },
  heroText: { flex: 1, minWidth: 0 },
  heroTextInner: { minHeight: 44, justifyContent: "center" },
  heroNameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
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
  nextUpIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
});
