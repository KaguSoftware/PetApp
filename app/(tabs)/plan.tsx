import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import EditStatSheet from "@/components/EditStatSheet";
import EditTextSheet from "@/components/EditTextSheet";
import EmptyState from "@/components/EmptyState";
import FeedPortionSheet from "@/components/FeedPortionSheet";
import NotificationBell from "@/components/NotificationBell";
import PageLoading from "@/components/PageLoading";
import Paywall from "@/components/Paywall";
import PetAvatar from "@/components/PetAvatar";
import { TabScreen } from "@/components/Screen";
import Sheet from "@/components/Sheet";
import { ACTION_ICON, Icon, type IconName } from "@/components/Icons";
import { AccentButton, Chevron, Group, IconCircle, Row, SectionHeader } from "@/components/ui";
import { CARE_PLANS, Pet, formatWeight, weightFeedingEntry } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cardShadow, colors, font, radius } from "@/lib/theme";

type CustomTargetKey = Exclude<keyof NonNullable<Pet["customPlan"]>, "cadences">;

const CUSTOM_TARGET_FIELDS: Record<"cat" | "dog", { key: CustomTargetKey; title: string; subtitle: string; icon: IconName }[]> = {
  cat: [
    { key: "fedPerDay", title: "Feeding", subtitle: "Meals per day", icon: "bowl" },
    { key: "fedGrams", title: "Food amount", subtitle: "Total grams per day", icon: "box" },
    { key: "waterPerDay", title: "Fresh water", subtitle: "Refreshes per day", icon: "drop" },
    { key: "litterPerDay", title: "Litter", subtitle: "Scoops per day", icon: "broom" },
  ],
  dog: [
    { key: "fedPerDay", title: "Feeding", subtitle: "Meals per day", icon: "bowl" },
    { key: "fedGrams", title: "Food amount", subtitle: "Total grams per day", icon: "box" },
    { key: "waterPerDay", title: "Fresh water", subtitle: "Refreshes per day", icon: "drop" },
    { key: "walkPerDay", title: "Walks", subtitle: "Walks per day", icon: "paw" },
  ],
};

/* The non-daily "other" care activities a custom breed still gets — mirrors the
 * grooming/health/vet items in the vet-built CARE_PLANS. Each has a default
 * cadence the family can edit (stored per-pet in customPlan.cadences[id]). */
type OtherCareField = { id: string; title: string; detail: string; cadence: string; icon: IconName };
const OTHER_CARE_FIELDS: Record<"cat" | "dog", OtherCareField[]> = {
  cat: [
    { id: "grooming", title: "Brushing / grooming", detail: "Regular brushing to manage shedding and prevent matting.", cadence: "Weekly", icon: "scissors" },
    { id: "nails", title: "Nail trimming", detail: "Clip nails to prevent overgrowth and snagging.", cadence: "Every 2-4 weeks", icon: "clipper" },
    { id: "dental", title: "Dental care", detail: "Teeth cleaning, water additives, or dental treats.", cadence: "3-7× weekly", icon: "sparkles" },
    { id: "weight", title: "Weight check", detail: "Routine monitoring to catch weight gain early.", cadence: "1-2× monthly", icon: "arrow-up" },
    { id: "parasite", title: "Parasite preventative", detail: "Routine flea, tick, and worm prevention.", cadence: "Monthly", icon: "shield" },
    { id: "vet", title: "Vet checkup", detail: "Wellness exams and vaccinations.", cadence: "Yearly", icon: "stethoscope" },
    { id: "meds", title: "Medication tracking", detail: "Log any medication prescribed by the vet.", cadence: "As prescribed", icon: "pill" },
  ],
  dog: [
    { id: "grooming", title: "Brushing / grooming", detail: "Regular brushing to manage shedding and prevent matting.", cadence: "1-2× weekly", icon: "scissors" },
    { id: "bathing", title: "Bathing", detail: "Occasional baths, or after muddy play.", cadence: "Every 6-8 weeks", icon: "drop" },
    { id: "ears", title: "Ear cleaning", detail: "Clean ears to prevent moisture buildup and infection.", cadence: "Weekly", icon: "bell" },
    { id: "nails", title: "Nail trimming", detail: "Clip nails to maintain proper paw structure.", cadence: "Every 3-4 weeks", icon: "clipper" },
    { id: "dental", title: "Dental care", detail: "Teeth brushing or dental chews to prevent tartar.", cadence: "3-7× weekly", icon: "sparkles" },
    { id: "weight", title: "Weight check", detail: "Routine monitoring to catch weight gain early.", cadence: "1-2× monthly", icon: "arrow-up" },
    { id: "parasite", title: "Parasite preventative", detail: "Routine heartworm, flea, and tick prevention.", cadence: "Monthly", icon: "shield" },
    { id: "vet", title: "Vet checkup", detail: "Wellness exams and vaccinations.", cadence: "Yearly", icon: "stethoscope" },
    { id: "meds", title: "Medication tracking", detail: "Log any medication prescribed by the vet.", cadence: "Daily or as prescribed", icon: "pill" },
  ],
};

const GENERIC_ICON: Record<string, IconName> = {
  "⚖️": "arrow-up",
  "🪥": "sparkles",
  "🛁": "drop",
  "👂": "bell",
  "🧶": "yarn",
  "🐾": "clipper",
  "🛡️": "shield",
  "🚪": "door",
  "💊": "pill",
};

type GuideGroupKey = "daily" | "weekly" | "vet";

const GUIDE_GROUPS: { key: GuideGroupKey; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "vet", label: "Vet controlled" },
];

// Every PlanItem title used across CARE_PLANS maps to one of the three cadence groups.
const GUIDE_GROUP_BY_TITLE: Record<string, GuideGroupKey> = {
  "Feeding": "daily",
  "Fresh water": "daily",
  "Litter box maintenance": "daily",
  "Play & mental stimulation": "daily",
  "Potty breaks": "daily",
  "Exercise & play": "daily",
  "Exercise & training": "daily",
  "Walks": "daily",
  "Brushing / grooming": "weekly",
  "Brushing / wrinkle cleaning": "weekly",
  "Ear cleaning": "weekly",
  "Bathing": "weekly",
  "Nail trimming": "weekly",
  "Dental care": "vet",
  "Weight check": "vet",
  "Parasite preventative": "vet",
  "Vet checkup": "vet",
  "Medication tracking": "vet",
};

const LOCKED_PREVIEWS: { icon: IconName; text: string }[] = [
  { icon: "bowl", text: "Feeding · 65 g per meal, 3× daily" },
  { icon: "scissors", text: "Brushing · 2× weekly" },
  { icon: "stethoscope", text: "Vet checkup · every 6 months" },
];

export default function PlanPage() {
  const router = useRouter();
  const { state, hydrated, editPet, logAction, toast } = useStore();
  const [petId, setPetId] = useState(state.pets[0]?.id ?? "");
  const [feedPortionOpen, setFeedPortionOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<CustomTargetKey | null>(null);
  const [editingCadence, setEditingCadence] = useState<string | null>(null);
  const [petPickerOpen, setPetPickerOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [openGroups, setOpenGroups] = useState<Set<GuideGroupKey>>(new Set());

  const toggleItem = (title: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const toggleGroup = (key: GuideGroupKey) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (!hydrated) {
    return (
      <TabScreen title="Care Plan" trailing={<NotificationBell />}>
        <PageLoading />
      </TabScreen>
    );
  }

  const pet = state.pets.find((p) => p.id === petId) ?? state.pets[0];
  if (!pet) {
    return (
      <TabScreen title="Care Plan" trailing={<NotificationBell />}>
        <View style={{ marginTop: 12 }}>
          <EmptyState
            icon="paw"
            title="No pets yet"
            body="Add a pet to see its care plan and daily checklist here."
            cta="Add a pet"
            onCta={() => router.push("/(tabs)/pets")}
          />
        </View>
      </TabScreen>
    );
  }
  const plan = CARE_PLANS[pet.breed];
  const feedingGuide = weightFeedingEntry(pet);

  // Today's logged actions for the selected pet — drives the "Today" checklist
  // (this glanceable status used to live on Home; Care is its single surface now).
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todays = state.activities.filter((a) => a.petId === pet.id && a.ts >= startOfDay.getTime());

  if (!state.premium) {
    return (
      <TabScreen title="Care Plan" trailing={<NotificationBell />}>
        <View style={styles.lockedWrap}>
          <View style={styles.lockCircle}>
            <Icon name="lock" size={34} color={colors.accent} />
          </View>
          <Text style={styles.lockedTitle}>Your pet&apos;s complete guide</Text>
          <Text style={styles.lockedBody}>
            A vet-built, breed-specific plan: exact portions in grams, grooming cadence, vet schedule. We remind you before you need
            to remember.
          </Text>
          <View style={styles.lockedPreviews}>
            {LOCKED_PREVIEWS.map((t) => (
              <View key={t.text} style={styles.lockedPreviewRow}>
                <View style={styles.lockedPreviewIcon}>
                  <Icon name={t.icon} size={16} color={colors.label2} />
                </View>
                {/* Blurred teaser copy — transparent glyphs with a soft shadow stand in for the web's blur filter. */}
                <Text style={styles.lockedPreviewText}>{t.text}</Text>
              </View>
            ))}
          </View>
          <View style={styles.lockedCta}>
            <AccentButton onPress={() => setPaywallOpen(true)}>Unlock with PetPal+</AccentButton>
          </View>
        </View>
        <Paywall open={paywallOpen} onClose={() => setPaywallOpen(false)} />
      </TabScreen>
    );
  }

  return (
    <TabScreen title="Care Plan" subtitle={plan ? `Vet-Built ${pet.breed}` : undefined} trailing={<NotificationBell />}>
      {state.pets.length > 1 ? (
        <Pressable
          onPress={() => setPetPickerOpen(true)}
          accessibilityLabel="Switch pet"
          hitSlop={8}
          style={({ pressed }) => [styles.petSwitcher, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.petSwitcherLabel}>{pet.name}</Text>
          <Chevron />
        </Pressable>
      ) : null}

      <Sheet open={petPickerOpen} onClose={() => setPetPickerOpen(false)}>
        <Text style={styles.sheetTitle}>Switch pet</Text>
        <Group style={{ marginTop: 12 }}>
          {state.pets.map((p) => (
            <Row
              key={p.id}
              onPress={() => {
                setPetId(p.id);
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

      {plan ? (
        <>
          <SectionHeader>Today</SectionHeader>
          <Group>
            {plan.items
              .filter((i) => i.perDay && i.action)
              .map((item) => {
                const target = item.perDay ?? 1;
                const done = todays.filter((a) => a.type === item.action).length;
                const complete = done >= target;
                const ai = ACTION_ICON[item.action!];
                return (
                  <Row
                    key={item.title}
                    onPress={
                      complete
                        ? undefined
                        : () => {
                            if (item.action === "fed") setFeedPortionOpen(true);
                            else logAction(pet.id, item.action!);
                          }
                    }
                    leading={
                      complete ? (
                        <View style={styles.doneCircle}>
                          <Icon name="check" size={18} color="#fff" />
                        </View>
                      ) : (
                        <IconCircle icon={ai.icon} tint={ai.tint} bg={ai.bg} />
                      )
                    }
                    title={item.title}
                    subtitle={complete ? "Complete for today" : item.detail.split(".")[0]}
                    trailing={
                      <Text style={[styles.countLabel, complete && { color: colors.green }]}>
                        {Math.min(done, target)}/{target}
                      </Text>
                    }
                  />
                );
              })}
          </Group>

          {feedingGuide ? (
            <>
              <SectionHeader>Weight &amp; feeding guide</SectionHeader>
              <Text style={styles.sectionHint}>Updates automatically as {pet.name} ages.</Text>
              <Group>
                <View style={styles.guideGrid}>
                  <View style={styles.guideCell}>
                    <Text style={styles.guideLabel}>Ideal weight</Text>
                    <Text style={styles.guideValue}>
                      {formatWeight(feedingGuide.weightKgRange[0], state.units)}–{formatWeight(feedingGuide.weightKgRange[1], state.units)}
                    </Text>
                  </View>
                  <View style={styles.guideCell}>
                    <Text style={styles.guideLabel}>Calories/day</Text>
                    <Text style={styles.guideValue}>
                      {feedingGuide.calorieRange[0]}–{feedingGuide.calorieRange[1]} kcal
                    </Text>
                  </View>
                  <View style={styles.guideCell}>
                    <Text style={styles.guideLabel}>Dry kibble</Text>
                    <Text style={styles.guideValue}>
                      ~{feedingGuide.kibbleGramsRange[0]}–{feedingGuide.kibbleGramsRange[1]} g
                    </Text>
                  </View>
                </View>
              </Group>
            </>
          ) : null}

          <Pressable
            onPress={() => setGuideOpen((v) => !v)}
            hitSlop={4}
            style={({ pressed }) => [styles.guideToggle, pressed && { opacity: 0.6 }]}
          >
            <SectionHeader style={{ marginTop: 0, marginBottom: 0, flex: 1 }}>Tap for full {pet.breed} guide</SectionHeader>
            <View style={guideOpen ? { transform: [{ rotate: "90deg" }] } : undefined}>
              <Chevron />
            </View>
          </Pressable>
          {guideOpen ? <Text style={styles.sectionHint}>{plan.intro}</Text> : null}
          {GUIDE_GROUPS.map((group) => {
            const items = plan.items.filter((item) => (GUIDE_GROUP_BY_TITLE[item.title] ?? "vet") === group.key);
            if (items.length === 0) return null;
            const isGroupOpen = openGroups.has(group.key);
            return (
              <View key={group.key} style={{ marginTop: 8 }}>
                <Pressable
                  onPress={() => toggleGroup(group.key)}
                  style={({ pressed }) => [styles.groupToggle, pressed && { backgroundColor: colors.fill }]}
                >
                  <Text style={styles.groupToggleLabel}>{group.label}</Text>
                  <View style={isGroupOpen ? { transform: [{ rotate: "90deg" }] } : undefined}>
                    <Chevron />
                  </View>
                </Pressable>
                {isGroupOpen ? (
                  <Group style={{ marginTop: 8 }}>
                    {items.map((item) => {
                      const ai = item.action ? ACTION_ICON[item.action] : null;
                      const icon: IconName = ai?.icon ?? GENERIC_ICON[item.emoji] ?? "heart-text";
                      const isOpen = openItems.has(item.title);
                      return (
                        <View key={item.title} style={styles.guideItem}>
                          <Pressable
                            onPress={() => toggleItem(item.title)}
                            style={({ pressed }) => [styles.guideItemHead, pressed && { opacity: 0.7 }]}
                          >
                            <IconCircle icon={icon} tint={ai?.tint ?? colors.label2} bg={ai?.bg ?? colors.fill} size={32} iconSize={16} />
                            <Text style={styles.guideItemTitle}>{item.title}</Text>
                            <View style={styles.cadencePill}>
                              <Text style={styles.cadencePillLabel}>{item.cadence}</Text>
                            </View>
                            <View style={isOpen ? { transform: [{ rotate: "90deg" }] } : undefined}>
                              <Chevron />
                            </View>
                          </Pressable>
                          {isOpen ? <Text style={styles.guideItemDetail}>{item.detail}</Text> : null}
                        </View>
                      );
                    })}
                  </Group>
                ) : null}
              </View>
            );
          })}
        </>
      ) : (
        <>
          <SectionHeader>Today</SectionHeader>
          <Text style={styles.sectionHint}>
            {pet.breed} isn&apos;t on our vet-built breed list yet — set your own daily targets below and PetPal will track against
            them.
          </Text>
          <Group>
            {CUSTOM_TARGET_FIELDS[pet.species].map((f) => {
              const value = pet.customPlan?.[f.key];
              return (
                <Row
                  key={f.key}
                  onPress={() => setEditingTarget(f.key)}
                  leading={<IconCircle icon={f.icon} tint={colors.accent} bg={colors.accentSoft} />}
                  title={f.title}
                  subtitle={value != null ? f.subtitle : `${f.subtitle} — not set`}
                  trailing={
                    <Text style={[styles.targetValue, value == null && { color: colors.label3 }]}>{value != null ? value : "Set"}</Text>
                  }
                />
              );
            })}
          </Group>

          <SectionHeader>Grooming, health &amp; vet</SectionHeader>
          <Text style={styles.sectionHint}>
            The rest of {pet.name}&apos;s routine. Tap any activity to set how often it should happen.
          </Text>
          <Group>
            {OTHER_CARE_FIELDS[pet.species].map((f) => {
              const cadence = pet.customPlan?.cadences?.[f.id] ?? f.cadence;
              return (
                <Row
                  key={f.id}
                  onPress={() => setEditingCadence(f.id)}
                  leading={<IconCircle icon={f.icon} tint={colors.accent} bg={colors.accentSoft} />}
                  title={f.title}
                  subtitle={f.detail}
                  trailing={
                    <View style={styles.cadencePill}>
                      <Text style={styles.cadencePillLabel}>{cadence}</Text>
                    </View>
                  }
                />
              );
            })}
          </Group>
        </>
      )}

      {!plan
        ? CUSTOM_TARGET_FIELDS[pet.species].map((f) => (
            <EditStatSheet
              key={f.key}
              open={editingTarget === f.key}
              onClose={() => setEditingTarget(null)}
              title={`${pet.name}'s ${f.title.toLowerCase()} target`}
              label={f.subtitle}
              initialValue={pet.customPlan?.[f.key]}
              onSave={(value) => {
                editPet(pet.id, {
                  name: pet.name,
                  breed: pet.breed,
                  ageYears: pet.ageYears,
                  weightKg: pet.weightKg,
                  cupGrams: pet.cupGrams,
                  customPlan: { ...pet.customPlan, [f.key]: value },
                });
                toast("list", `${f.title} target updated`, `${value} ${f.subtitle.toLowerCase()}`);
              }}
            />
          ))
        : null}

      {!plan
        ? OTHER_CARE_FIELDS[pet.species].map((f) => (
            <EditTextSheet
              key={f.id}
              open={editingCadence === f.id}
              onClose={() => setEditingCadence(null)}
              title={`${f.title} frequency`}
              label="How often"
              placeholder={f.cadence}
              initialValue={pet.customPlan?.cadences?.[f.id] ?? f.cadence}
              onSave={(value) => {
                editPet(pet.id, {
                  name: pet.name,
                  breed: pet.breed,
                  ageYears: pet.ageYears,
                  weightKg: pet.weightKg,
                  cupGrams: pet.cupGrams,
                  customPlan: {
                    ...pet.customPlan,
                    cadences: { ...pet.customPlan?.cadences, [f.id]: value },
                  },
                });
                toast("list", `${f.title} updated`, value);
              }}
            />
          ))
        : null}

      <FeedPortionSheet pet={pet} open={feedPortionOpen} onClose={() => setFeedPortionOpen(false)} />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  lockedWrap: { alignItems: "center", paddingTop: 40, paddingBottom: 24 },
  lockCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  lockedTitle: { marginTop: 20, fontSize: 22, fontFamily: font.bold, letterSpacing: -0.3, color: colors.label, textAlign: "center" },
  lockedBody: {
    marginTop: 8,
    maxWidth: 300,
    fontSize: 14,
    fontFamily: font.regular,
    color: colors.label2,
    textAlign: "center",
    lineHeight: 21,
  },
  lockedPreviews: { marginTop: 28, width: "100%", gap: 10 },
  lockedPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...cardShadow,
  },
  lockedPreviewIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
  lockedPreviewText: {
    fontSize: 14,
    fontFamily: font.medium,
    color: "transparent",
    textShadowColor: colors.label2,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  lockedCta: { marginTop: 28, width: "100%" },
  petSwitcher: { marginTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 44 },
  petSwitcherLabel: { fontSize: 18, fontFamily: font.semibold, color: colors.label },
  sheetTitle: { fontSize: 20, fontFamily: font.bold, letterSpacing: -0.2, color: colors.label, paddingHorizontal: 4 },
  doneCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" },
  countLabel: { fontSize: 13, fontFamily: font.semibold, color: colors.label3 },
  sectionHint: { marginBottom: 12, paddingHorizontal: 4, fontSize: 13, fontFamily: font.regular, color: colors.label2, lineHeight: 19 },
  guideGrid: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 14 },
  guideCell: { flex: 1, alignItems: "center" },
  guideLabel: { fontSize: 11, fontFamily: font.medium, color: colors.label2 },
  guideValue: { marginTop: 1, fontSize: 14, fontFamily: font.semibold, color: colors.label, textAlign: "center" },
  guideToggle: { marginTop: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, minHeight: 44 },
  groupToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.sep,
    minHeight: 48,
    ...cardShadow,
  },
  groupToggleLabel: { fontSize: 15, fontFamily: font.semibold, color: colors.label },
  guideItem: { paddingHorizontal: 16, paddingVertical: 14 },
  guideItemHead: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 32 },
  guideItemTitle: { flex: 1, fontSize: 15, fontFamily: font.semibold, color: colors.label },
  cadencePill: { borderRadius: radius.full, backgroundColor: colors.accentSoft, paddingHorizontal: 10, paddingVertical: 4 },
  cadencePillLabel: { fontSize: 11, fontFamily: font.semibold, color: colors.accent },
  guideItemDetail: { marginTop: 8, paddingLeft: 44, fontSize: 13, fontFamily: font.regular, color: colors.label2, lineHeight: 19 },
  targetValue: { fontSize: 13, fontFamily: font.semibold, color: colors.label },
});
