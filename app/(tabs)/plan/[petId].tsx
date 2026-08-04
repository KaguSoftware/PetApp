import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import EditStatSheet from "@/components/EditStatSheet";
import EditTextSheet from "@/components/EditTextSheet";
import EmptyState from "@/components/EmptyState";
import PageLoading from "@/components/PageLoading";
import Paywall from "@/components/Paywall";
import PetAvatar from "@/components/PetAvatar";
import { PushedScreen } from "@/components/Screen";
import NutritionCard from "@/components/nutrition/NutritionCard";
import { ACTION_ICON, actionTone, Icon, type IconName } from "@/components/Icons";
import { AccentButton, Chevron, Chip, Group, IconCircle, PressableScale, SectionHeader } from "@/components/ui";
import {
  CARE_PLANS,
  dailyGramTarget,
  dailyTarget,
  formatWeight,
  type ActionType,
  type Pet,
  weightFeedingEntry,
} from "@/lib/data";
import { useStore } from "@/lib/store";
import { font, radius, useColors, withAlpha, type Colors } from "@/lib/theme";
import { usePullToRefresh } from "@/lib/useRefresh";

type CustomTargetKey = Exclude<keyof NonNullable<Pet["customPlan"]>, "cadences">;

/** The four counts a day is actually made of, per species. Order is fixed —
 *  this grid is read by position on every visit. */
const DAILY_CELLS: Record<
  "cat" | "dog",
  { key: CustomTargetKey; action: ActionType; title: string; unit: string; grams?: true }[]
> = {
  cat: [
    { key: "fedPerDay", action: "fed", title: "Meals", unit: "a day" },
    { key: "fedGrams", action: "fed", title: "Food", unit: "g a day", grams: true },
    { key: "waterPerDay", action: "water", title: "Water", unit: "a day" },
    { key: "litterPerDay", action: "litter", title: "Litter", unit: "a day" },
  ],
  dog: [
    { key: "fedPerDay", action: "fed", title: "Meals", unit: "a day" },
    { key: "fedGrams", action: "fed", title: "Food", unit: "g a day", grams: true },
    { key: "waterPerDay", action: "water", title: "Water", unit: "a day" },
    { key: "walkPerDay", action: "walk", title: "Walks", unit: "a day" },
  ],
};

/** The rest of the routine for a breed with no vet-built plan. Each cadence is
 *  a default the family can rewrite (stored per-pet in customPlan.cadences). */
type RoutineItem = { id: string; icon: IconName; title: string; detail: string; cadence: string };

const CUSTOM_ROUTINE: Record<"cat" | "dog", RoutineItem[]> = {
  cat: [
    { id: "grooming", icon: "scissors", title: "Brushing", detail: "Regular brushing to manage shedding and prevent matting.", cadence: "Weekly" },
    { id: "nails", icon: "clipper", title: "Nail trimming", detail: "Clip nails to prevent overgrowth and snagging.", cadence: "Every 2-4 weeks" },
    { id: "dental", icon: "sparkles", title: "Dental care", detail: "Teeth cleaning, water additives, or dental treats.", cadence: "3-7× weekly" },
    { id: "weight", icon: "scale", title: "Weight check", detail: "Routine monitoring to catch weight gain early.", cadence: "1-2× monthly" },
    { id: "parasite", icon: "shield", title: "Parasite preventative", detail: "Routine flea, tick, and worm prevention.", cadence: "Monthly" },
    { id: "vet", icon: "stethoscope", title: "Vet checkup", detail: "Wellness exams and vaccinations.", cadence: "Yearly" },
    { id: "meds", icon: "pill", title: "Medication", detail: "Log any medication prescribed by the vet.", cadence: "As prescribed" },
  ],
  dog: [
    { id: "grooming", icon: "scissors", title: "Brushing", detail: "Regular brushing to manage shedding and prevent matting.", cadence: "1-2× weekly" },
    { id: "bathing", icon: "drop", title: "Bathing", detail: "Occasional baths, or after muddy play.", cadence: "Every 6-8 weeks" },
    { id: "ears", icon: "bell", title: "Ear cleaning", detail: "Clean ears to prevent moisture buildup and infection.", cadence: "Weekly" },
    { id: "nails", icon: "clipper", title: "Nail trimming", detail: "Clip nails to maintain proper paw structure.", cadence: "Every 3-4 weeks" },
    { id: "dental", icon: "sparkles", title: "Dental care", detail: "Teeth brushing or dental chews to prevent tartar.", cadence: "3-7× weekly" },
    { id: "weight", icon: "scale", title: "Weight check", detail: "Routine monitoring to catch weight gain early.", cadence: "1-2× monthly" },
    { id: "parasite", icon: "shield", title: "Parasite preventative", detail: "Routine heartworm, flea, and tick prevention.", cadence: "Monthly" },
    { id: "vet", icon: "stethoscope", title: "Vet checkup", detail: "Wellness exams and vaccinations.", cadence: "Yearly" },
    { id: "meds", icon: "pill", title: "Medication", detail: "Log any medication prescribed by the vet.", cadence: "Daily or as prescribed" },
  ],
};

/** Fallback icons for the vet-built plan items that carry no ActionType. */
const EMOJI_ICON: Record<string, IconName> = {
  "⚖️": "scale",
  "🪥": "sparkles",
  "🛁": "drop",
  "👂": "bell",
  "🧶": "yarn",
  "🐾": "clipper",
  "🛡️": "shield",
  "🚪": "door",
  "💊": "pill",
  "🦮": "paw",
  "🩺": "stethoscope",
  "✂️": "scissors",
};

/** The four levers the daily grid already answers — they don't repeat below it. */
const GRID_ACTIONS: ActionType[] = ["fed", "water", "litter", "walk"];

/**
 * One pet's plan.
 *
 * This is where the Care tab's long-form content moved when the tab became a
 * board. The pet is in the URL, so there is no picker and no "currently
 * viewing" state to hold: the page is only ever about the animal you named on
 * the way in.
 *
 * Two halves, and only two. The day is a grid of counts, because a target is a
 * number and a number should look like one. Everything slower than a day is a
 * list of cadences, because that is what those items are — a frequency and a
 * sentence, the sentence hidden until you ask for it.
 */
export default function PetPlanScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { state, hydrated, editPet, toast } = useStore();
  const refreshControl = usePullToRefresh();

  const [editingTarget, setEditingTarget] = useState<CustomTargetKey | null>(null);
  const [editingCadence, setEditingCadence] = useState<string | null>(null);
  const [openDetail, setOpenDetail] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const pet = state.pets.find((p) => p.id === petId);

  if (!hydrated) {
    return (
      <PushedScreen title="Plan">
        <PageLoading />
      </PushedScreen>
    );
  }

  if (!pet) {
    return (
      <PushedScreen title="Plan">
        <View style={{ marginTop: 16 }}>
          <EmptyState icon="paw" title="Pet not found" body="This pet is no longer in the household." cta="Back to Care" onCta={() => router.back()} />
        </View>
      </PushedScreen>
    );
  }

  if (!state.premium) {
    return (
      <PushedScreen title={`${pet.name}'s plan`}>
        <View style={{ marginTop: 16 }}>
          <EmptyState
            icon="lock"
            title="Part of PetPal+"
            body={`Exact portions, grooming cadence and ${pet.name}'s vet schedule.`}
            cta="Unlock PetPal+"
            onCta={() => setPaywallOpen(true)}
          />
        </View>
        <Paywall open={paywallOpen} onClose={() => setPaywallOpen(false)} />
      </PushedScreen>
    );
  }

  const plan = CARE_PLANS[pet.breed];
  const guide = weightFeedingEntry(pet);
  const editable = !plan;

  const cells = DAILY_CELLS[pet.species].map((c) => {
    const tone = actionTone(colors, c.action);
    const value = c.grams ? dailyGramTarget(pet) : dailyTarget(pet, c.action);
    return { ...c, tone, value };
  });

  const routine: (RoutineItem & { cadence: string })[] = plan
    ? plan.items
        .filter((i) => !(i.action && GRID_ACTIONS.includes(i.action)))
        .map((i) => ({
          id: i.title,
          icon: i.action ? ACTION_ICON[i.action].icon : (EMOJI_ICON[i.emoji] ?? "heart-text"),
          title: i.title,
          detail: i.detail,
          cadence: i.cadence,
        }))
    : CUSTOM_ROUTINE[pet.species].map((i) => ({ ...i, cadence: pet.customPlan?.cadences?.[i.id] ?? i.cadence }));

  /** Targets and cadences are stored on the pet, so every save resends identity. */
  const savePet = (customPlan: Pet["customPlan"]) =>
    editPet(pet.id, {
      name: pet.name,
      breed: pet.breed,
      ageYears: pet.ageYears,
      weightKg: pet.weightKg,
      cupGrams: pet.cupGrams,
      customPlan,
    });

  return (
    <PushedScreen title={`${pet.name}'s plan`} refreshControl={refreshControl}>
      <View style={styles.identity}>
        <PetAvatar pet={pet} size="md" />
        <View style={styles.identityText}>
          <Text numberOfLines={1} style={styles.breed}>
            {pet.breed}
          </Text>
          <Text style={styles.origin}>{plan ? "Vet-built plan" : "Your own targets"}</Text>
        </View>
      </View>

      <SectionHeader>Every day</SectionHeader>
      <View style={styles.grid}>
        {cells.map((c) => {
          const body = (
            <View style={[styles.cell, { backgroundColor: c.tone.bg, borderColor: withAlpha(c.tone.tint, 0.22) }]}>
              <Icon name={c.tone.icon} size={20} color={c.tone.tint} strokeWidth={1.9} />
              <View style={styles.cellFigureRow}>
                <Text style={[styles.cellFigure, { color: c.tone.tint }]}>{c.value ?? "—"}</Text>
                <Text style={styles.cellUnit}>{c.value != null ? c.unit : editable ? "tap to set" : "not set"}</Text>
              </View>
              <Text style={styles.cellTitle}>{c.title}</Text>
            </View>
          );
          if (!editable) return <View key={c.key} style={styles.cellSlot}>{body}</View>;
          return (
            <PressableScale
              key={c.key}
              haptic
              onPress={() => setEditingTarget(c.key)}
              accessibilityRole="button"
              accessibilityLabel={`${c.title} target, ${c.value ?? "not set"}`}
              accessibilityHint="Opens the target editor"
              style={styles.cellSlot}
            >
              {body}
            </PressableScale>
          );
        })}
      </View>

      <View style={{ marginTop: 18 }}>
        <NutritionCard pet={pet} />
      </View>

      {guide ? (
        <>
          <SectionHeader>Weight &amp; feeding</SectionHeader>
          <View style={styles.guideRow}>
            <View style={styles.guideCell}>
              <Text style={styles.guideLabel}>Ideal weight</Text>
              <Text style={styles.guideValue}>
                {formatWeight(guide.weightKgRange[0], state.units)}–{formatWeight(guide.weightKgRange[1], state.units)}
              </Text>
            </View>
            <View style={styles.guideCell}>
              <Text style={styles.guideLabel}>Calories</Text>
              <Text style={styles.guideValue}>
                {guide.calorieRange[0]}–{guide.calorieRange[1]} kcal
              </Text>
            </View>
            <View style={styles.guideCell}>
              <Text style={styles.guideLabel}>Dry kibble</Text>
              <Text style={styles.guideValue}>
                ~{guide.kibbleGramsRange[0]}–{guide.kibbleGramsRange[1]} g
              </Text>
            </View>
          </View>
          <Text style={styles.hint}>Updates itself as {pet.name} gets older.</Text>
        </>
      ) : null}

      <SectionHeader>The rest of the routine</SectionHeader>
      <Group>
        {routine.map((item) => {
          const isOpen = openDetail === item.id;
          return (
            <View key={item.id} style={styles.routineItem}>
              <PressableScale
                onPress={() => (editable ? setEditingCadence(item.id) : setOpenDetail(isOpen ? null : item.id))}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${item.cadence}`}
                accessibilityState={editable ? undefined : { expanded: isOpen }}
              >
                <View style={styles.routineHead}>
                  <IconCircle icon={item.icon} tint={colors.label2} bg={colors.fill} size={32} iconSize={16} />
                  <Text numberOfLines={1} style={styles.routineTitle}>
                    {item.title}
                  </Text>
                  <Chip style={{ backgroundColor: colors.accentSoft }}>
                    <Text style={styles.cadence}>{item.cadence}</Text>
                  </Chip>
                  <View style={!editable && isOpen ? { transform: [{ rotate: "90deg" }] } : undefined}>
                    <Chevron />
                  </View>
                </View>
              </PressableScale>
              {isOpen && !editable ? <Text style={styles.routineDetail}>{item.detail}</Text> : null}
            </View>
          );
        })}
      </Group>
      {editable ? <Text style={styles.hint}>Tap any activity to change how often it should happen.</Text> : null}

      {plan ? (
        <>
          <SectionHeader>About the breed</SectionHeader>
          <Text style={styles.intro}>{plan.intro}</Text>
        </>
      ) : (
        <View style={styles.customNote}>
          <Text style={styles.customNoteText}>
            {pet.breed} isn&apos;t on the vet-built breed list yet, so these are your numbers. PetPal tracks against them exactly the
            same way.
          </Text>
          <AccentButton variant="tinted" size="sm" onPress={() => router.push("/instructions")}>
            Read the guides
          </AccentButton>
        </View>
      )}

      {editable
        ? DAILY_CELLS[pet.species].map((c) => (
            <EditStatSheet
              key={c.key}
              open={editingTarget === c.key}
              onClose={() => setEditingTarget(null)}
              title={`${pet.name}'s ${c.title.toLowerCase()} target`}
              label={c.grams ? "Total grams per day" : `${c.title} per day`}
              initialValue={pet.customPlan?.[c.key]}
              onSave={(value) => {
                savePet({ ...pet.customPlan, [c.key]: value });
                toast("list", `${c.title} target updated`, `${value} ${c.unit}`);
              }}
            />
          ))
        : null}

      {editable
        ? CUSTOM_ROUTINE[pet.species].map((item) => (
            <EditTextSheet
              key={item.id}
              open={editingCadence === item.id}
              onClose={() => setEditingCadence(null)}
              title={`${item.title} frequency`}
              label="How often"
              placeholder={item.cadence}
              initialValue={pet.customPlan?.cadences?.[item.id] ?? item.cadence}
              onSave={(value) => {
                savePet({ ...pet.customPlan, cadences: { ...pet.customPlan?.cadences, [item.id]: value } });
                toast("list", `${item.title} updated`, value);
              }}
            />
          ))
        : null}
    </PushedScreen>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    identity: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 14 },
    identityText: { flex: 1, minWidth: 0 },
    breed: { fontSize: 20, fontFamily: font.bold, letterSpacing: -0.35, color: colors.label },
    origin: { marginTop: 2, fontSize: 13, fontFamily: font.medium, color: colors.label2 },

    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    // 47% (not 50 minus the gap) is the same two-up rhythm the rest of the app
    // uses, and it survives a wider system text size without wrapping to one.
    cellSlot: { flexBasis: "47%", flexGrow: 1 },
    cell: {
      minHeight: 108,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 13,
    },
    cellFigureRow: { marginTop: "auto", paddingTop: 10, flexDirection: "row", alignItems: "baseline", gap: 5 },
    cellFigure: { fontSize: 28, fontFamily: font.bold, letterSpacing: -1 },
    cellUnit: { flexShrink: 1, fontSize: 12, fontFamily: font.medium, color: colors.label2 },
    cellTitle: { marginTop: 1, fontSize: 14, fontFamily: font.semibold, color: colors.label },

    guideRow: {
      flexDirection: "row",
      gap: 8,
      borderRadius: radius.md,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.sep,
      paddingHorizontal: 12,
      paddingVertical: 14,
    },
    guideCell: { flex: 1, alignItems: "center" },
    guideLabel: { fontSize: 11, fontFamily: font.medium, color: colors.label2 },
    guideValue: { marginTop: 2, fontSize: 14, fontFamily: font.semibold, color: colors.label, textAlign: "center" },

    routineItem: { paddingHorizontal: 16, paddingVertical: 13 },
    routineHead: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 32 },
    routineTitle: { flex: 1, fontSize: 15, fontFamily: font.semibold, color: colors.label },
    cadence: { fontSize: 11, fontFamily: font.semibold, color: colors.accent },
    routineDetail: { marginTop: 8, paddingLeft: 44, fontSize: 13, fontFamily: font.regular, color: colors.label2, lineHeight: 19 },

    hint: { marginTop: 10, paddingHorizontal: 4, fontSize: 13, fontFamily: font.regular, color: colors.label2, lineHeight: 19 },
    intro: { paddingHorizontal: 4, fontSize: 14, fontFamily: font.regular, color: colors.label2, lineHeight: 21 },
    customNote: { marginTop: 26, gap: 14, paddingHorizontal: 4 },
    customNoteText: { fontSize: 14, fontFamily: font.regular, color: colors.label2, lineHeight: 21 },
  });
