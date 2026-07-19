import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import EmptyState from "@/components/EmptyState";
import EditStatSheet from "@/components/EditStatSheet";
import HeaderActions from "@/components/HeaderActions";
import PetAvatar from "@/components/PetAvatar";
import { TabScreen } from "@/components/Screen";
import Sheet from "@/components/Sheet";
import StreakCalendarSheet from "@/components/StreakCalendarSheet";
import Welcome from "@/components/Welcome";
import { Icon } from "@/components/Icons";
import { Chevron, Chip, Group, PressableScale, PRESS_SCALE_SMALL, Row, SheetTitle } from "@/components/ui";
import { dailyTarget, formatAge, formatWeight, kgToUnit, unitToKg, weightUnitLabel } from "@/lib/data";
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
  const { state, hydrated, addWeight, editPet, toast } = useStore();
  const router = useRouter();
  const refreshControl = usePullToRefresh();
  const [petIndex, setPetIndex] = useState(0);
  const [editingStat, setEditingStat] = useState<"weight" | "age" | null>(null);
  const [petPickerOpen, setPetPickerOpen] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);

  const changePet = (dir: 1 | -1) => setPetIndex((i) => Math.min(state.pets.length - 1, Math.max(0, i + dir)));

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
  const todays = useMemo(
    () => (pet ? state.activities.filter((a) => a.petId === pet.id && a.ts >= startOfDay.getTime()) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.activities, pet?.id]
  );

  // Horizontal swipe on the hero card pages between pets, like the web's
  // pointer swipe. activeOffsetX keeps taps and vertical scrolls untouched.
  //
  // The threshold is deliberately generous (25, not 15): this Pan wraps the
  // whole hero, including the small chips and the 7pt pet dots, and a tap that
  // drifts past the threshold cancels the press instead of firing it. Small
  // targets attract exactly that kind of imprecise tap.
  const swipe = Gesture.Pan()
    .activeOffsetX([-25, 25])
    .failOffsetY([-12, 12])
    .onEnd((e) => {
      if (Math.abs(e.translationX) > 45 && Math.abs(e.translationX) > Math.abs(e.translationY) * 1.4) {
        runOnJS(changePet)(e.translationX < 0 ? 1 : -1);
      }
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
  // Use the canonical daily target (breed plan → species default) so a
  // plan-less cat targets 3 meals here, matching the rest of the app, not a
  // hardcoded 2.
  const fedTarget = dailyTarget(pet, "fed") ?? 2;
  const fedCount = todays.filter((a) => a.type === "fed").length;
  const fedPct = Math.min(100, Math.round((fedCount / fedTarget) * 100));

  // Household-wide outstanding alerts, deduped by pet+title (the data can hold
  // duplicates) — Home shows one calm summary line, the details live on /activity.
  const alertCount = new Set(state.reminders.filter((r) => r.alert && !r.done).map((r) => `${r.petId}|${r.title}`)).size;

  const nextReminder = state.reminders.filter((r) => !r.done && r.petId === pet.id).sort((a, b) => a.due - b.due)[0];

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
      {/* Pet hero card */}
      <GestureDetector gesture={swipe}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <PressableScale
              onPress={() => router.push(`/pet/${pet.id}`)}
              accessibilityLabel={`Open ${pet.name}'s details`}
              hitSlop={6}
            >
              <PetAvatar pet={pet} size="lg" idle />
            </PressableScale>
            {/* Visible switch affordance next to the swipe gesture: the name
                row opens the same switch-pet sheet the other tabs use. */}
            <PressableScale
              scaleTo={0.99}
              onPress={() => (multiPet ? setPetPickerOpen(true) : router.push(`/pet/${pet.id}`))}
              accessibilityLabel={multiPet ? "Switch pet" : `Open ${pet.name}'s details`}
              style={styles.heroText}
            >
              <View style={styles.heroTextInner}>
                <View style={styles.heroNameRow}>
                  <Text numberOfLines={1} style={styles.heroName}>
                    {pet.name}
                  </Text>
                  <Chevron />
                </View>
                <Text numberOfLines={1} style={styles.heroBreed}>
                  {pet.breed}
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
                <Text style={styles.chipText}>{formatAge(pet.ageYears)}</Text>
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
                <Text style={styles.chipText}>{formatWeight(pet.weightKg, state.units)}</Text>
                <Icon name="chevron-right" size={9} color={colors.label3} />
              </Chip>
            </PressableScale>
          </View>

          <View style={{ marginTop: 16 }}>
            <View style={styles.mealsRow}>
              <Text style={styles.mealsLabel}>Meals today</Text>
              <Text style={styles.mealsCount}>
                {fedCount} <Text style={{ color: colors.label3 }}>of {fedTarget}</Text>
              </Text>
            </View>
            <MealsBar pct={fedPct} />
          </View>

          {multiPet && (
            <View style={styles.dotsRow}>
              {state.pets.map((p, i) => (
                <PressableScale
                  key={p.id}
                  scaleTo={PRESS_SCALE_SMALL}
                  onPress={() => setPetIndex(i)}
                  accessibilityLabel={`Show ${p.name}`}
                  hitSlop={10}
                >
                  <View style={[styles.petDot, i === petIndex && styles.petDotActive]} />
                </PressableScale>
              ))}
            </View>
          )}
        </View>
      </GestureDetector>

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
      <Group style={{ marginTop: 32 }}>
        <Row
          onPress={() => router.push("/reminders")}
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
  hero: { borderRadius: radius.lg, backgroundColor: colors.card, padding: 20, ...cardShadow },
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
  petDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: withAlpha(colors.label, 0.18) },
  petDotActive: { width: 20, backgroundColor: colors.label },
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
