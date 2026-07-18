import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import EditStatSheet from "@/components/EditStatSheet";
import EditTextSheet from "@/components/EditTextSheet";
import Meds from "@/components/Meds";
import PageLoading from "@/components/PageLoading";
import PetAvatar, { InitialAvatar } from "@/components/PetAvatar";
import PixelChart from "@/components/pixel/PixelChart";
import { PushedScreen } from "@/components/Screen";
import Sheet from "@/components/Sheet";
import { ACTION_ICON, Icon } from "@/components/Icons";
import { AccentButton, Chip, ConfirmRow, Group, IconCircle, Row, SectionHeader, Segmented } from "@/components/ui";
import {
  ACTIONS,
  CARE_PLANS,
  formatAge,
  formatWeight,
  kgToUnit,
  nextAnniversary,
  nextBirthday,
  unitToKg,
  weightFeedingEntry,
  weightTargetRange,
  weightUnitLabel,
} from "@/lib/data";
import { timeAgo, useStore } from "@/lib/store";
import { cardShadow, colors, font, radius } from "@/lib/theme";

const DATE_FMT: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };

function fmtDate(ts: number, fmt: Intl.DateTimeFormatOptions = DATE_FMT) {
  return new Date(ts).toLocaleDateString(undefined, fmt);
}

// Module-level so a direct Date.now() never sits in JSX (same pattern as
// dueLabel/timeAgo in the store).
function isPast(ts: number) {
  return ts < Date.now();
}

function atNoon(d: Date) {
  const c = new Date(d);
  c.setHours(12, 0, 0, 0);
  return c.getTime();
}

function shiftDays(ts: number, n: number) {
  const d = new Date(ts);
  d.setDate(d.getDate() + n);
  return atNoon(d);
}

function shiftMonths(now: number, months: number) {
  const d = new Date(now);
  d.setMonth(d.getMonth() + months);
  return atNoon(d);
}

function shiftYears(now: number, years: number) {
  const d = new Date(now);
  d.setFullYear(d.getFullYear() + years);
  return atNoon(d);
}

/**
 * No-dependency date input for sheets — replaces the web's <input type=date>:
 * a day stepper flanking the current value, plus quick-jump chips.
 */
function DateField({
  value,
  onChange,
  mode = "past",
  allowClear = false,
}: {
  value: number | null;
  onChange: (ts: number | null) => void;
  mode?: "past" | "future";
  allowClear?: boolean;
}) {
  const today = atNoon(new Date());
  const chips: { label: string; ts: number }[] =
    mode === "past"
      ? [
          { label: "Today", ts: today },
          { label: "1 wk ago", ts: shiftDays(today, -7) },
          { label: "1 mo ago", ts: shiftMonths(today, -1) },
          { label: "6 mo ago", ts: shiftMonths(today, -6) },
          { label: "1 yr ago", ts: shiftYears(today, -1) },
        ]
      : [
          { label: "In 1 mo", ts: shiftMonths(today, 1) },
          { label: "In 3 mo", ts: shiftMonths(today, 3) },
          { label: "In 6 mo", ts: shiftMonths(today, 6) },
          { label: "In 1 yr", ts: shiftYears(today, 1) },
          { label: "In 3 yrs", ts: shiftYears(today, 3) },
        ];
  return (
    <View>
      <View style={dfStyles.stepperRow}>
        <Pressable
          onPress={() => onChange(shiftDays(value ?? today, -1))}
          accessibilityLabel="One day earlier"
          hitSlop={8}
          style={({ pressed }) => [dfStyles.stepButton, pressed && { backgroundColor: colors.fill }]}
        >
          <Icon name="chevron-left" size={16} color={colors.accent} />
        </Pressable>
        <Text style={[dfStyles.valueLabel, value == null && { color: colors.label3 }]}>
          {value != null ? fmtDate(value) : "Not set"}
        </Text>
        <Pressable
          onPress={() => onChange(shiftDays(value ?? today, 1))}
          accessibilityLabel="One day later"
          hitSlop={8}
          style={({ pressed }) => [dfStyles.stepButton, pressed && { backgroundColor: colors.fill }]}
        >
          <Icon name="chevron-right" size={16} color={colors.accent} />
        </Pressable>
      </View>
      <View style={dfStyles.chipRow}>
        {chips.map((c) => {
          const active = value === c.ts;
          return (
            <Pressable
              key={c.label}
              onPress={() => onChange(c.ts)}
              hitSlop={6}
              style={({ pressed }) => [dfStyles.chip, active && dfStyles.chipActive, pressed && { opacity: 0.7 }]}
            >
              <Text style={[dfStyles.chipLabel, active && dfStyles.chipLabelActive]}>{c.label}</Text>
            </Pressable>
          );
        })}
        {allowClear ? (
          <Pressable
            onPress={() => onChange(null)}
            hitSlop={6}
            style={({ pressed }) => [dfStyles.chip, value == null && dfStyles.chipActive, pressed && { opacity: 0.7 }]}
          >
            <Text style={[dfStyles.chipLabel, value == null && dfStyles.chipLabelActive]}>None</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const dfStyles = StyleSheet.create({
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    backgroundColor: colors.card,
    paddingHorizontal: 6,
    paddingVertical: 5,
    ...cardShadow,
  },
  stepButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  valueLabel: { flex: 1, textAlign: "center", fontSize: 16, fontFamily: font.medium, color: colors.label },
  chipRow: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderRadius: radius.full, backgroundColor: colors.fill, paddingHorizontal: 11, paddingVertical: 6 },
  chipActive: { backgroundColor: colors.accentSoft },
  chipLabel: { fontSize: 12, fontFamily: font.semibold, color: colors.label2 },
  chipLabelActive: { color: colors.accent },
});

export default function PetDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    state,
    hydrated,
    restockSupply,
    addWeight,
    deleteWeight,
    editPet,
    deletePet,
    addVaccination,
    deleteVaccination,
    addVetVisit,
    deleteVetVisit,
    toast,
  } = useStore();
  const [editing, setEditing] = useState<"weight" | "age" | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [backfillOpen, setBackfillOpen] = useState(false);
  const [bfWeight, setBfWeight] = useState("");
  const [bfDate, setBfDate] = useState<number | null>(null);
  const [vaccOpen, setVaccOpen] = useState(false);
  const [vaccName, setVaccName] = useState("");
  const [vaccGiven, setVaccGiven] = useState<number | null>(null);
  const [vaccNext, setVaccNext] = useState<number | null>(null);
  const [visitOpen, setVisitOpen] = useState(false);
  const [visitDate, setVisitDate] = useState<number | null>(null);
  const [visitVet, setVisitVet] = useState("");
  const [visitReason, setVisitReason] = useState("");
  const [birthdayOpen, setBirthdayOpen] = useState(false);
  const [birthdayTs, setBirthdayTs] = useState<number | null>(null);
  const [sexOpen, setSexOpen] = useState(false);
  const [sexVal, setSexVal] = useState<"male" | "female" | "unset">("unset");
  const [identityEditing, setIdentityEditing] = useState<"microchip" | "allergies" | "notes" | null>(null);

  if (!hydrated) {
    return (
      <PushedScreen title="Pet">
        <PageLoading />
      </PushedScreen>
    );
  }

  const pet = state.pets.find((p) => p.id === id);
  if (!pet) {
    return (
      <PushedScreen title="Pet">
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>Pet not found</Text>
          <Pressable onPress={() => router.replace("/")} hitSlop={10}>
            <Text style={styles.notFoundLink}>Back home</Text>
          </Pressable>
        </View>
      </PushedScreen>
    );
  }

  const plan = CARE_PLANS[pet.breed];
  const target = weightTargetRange(pet);
  const feedingGuide = weightFeedingEntry(pet);
  const recent = state.activities
    .filter((a) => a.petId === pet.id)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 5);

  // Every editPet call routes through here so narrow edits (age chip, identity
  // rows) always carry the required base fields and never clobber the rest.
  const basePatch = {
    name: pet.name,
    breed: pet.breed,
    ageYears: pet.ageYears,
    weightKg: pet.weightKg,
    cupGrams: pet.cupGrams,
  };

  return (
    <PushedScreen title={pet.name}>
      {/* Hero */}
      <View style={styles.hero}>
        <PetAvatar pet={pet} size="xl" idle />
        <Text style={styles.heroName}>{pet.name}</Text>
        <Text style={styles.heroBreed}>{pet.breed}</Text>
        <View style={styles.chipRow}>
          <Pressable
            accessibilityLabel="Edit age"
            hitSlop={8}
            onPress={() => {
              // With a birth date on file, age is derived — edit the date instead.
              if (pet.birthDate != null) {
                setBirthdayTs(pet.birthDate);
                setBirthdayOpen(true);
              } else setEditing("age");
            }}
            style={({ pressed }) => (pressed ? { transform: [{ scale: 0.95 }] } : undefined)}
          >
            <Chip>
              <Text style={styles.chipText}>{formatAge(pet.ageYears)}</Text>
              <Icon name="chevron-right" size={9} color={colors.label3} />
            </Chip>
          </Pressable>
          <Pressable
            accessibilityLabel="Edit weight"
            hitSlop={8}
            onPress={() => setEditing("weight")}
            style={({ pressed }) => (pressed ? { transform: [{ scale: 0.95 }] } : undefined)}
          >
            <Chip>
              <Text style={styles.chipText}>{formatWeight(pet.weightKg, state.units)}</Text>
              <Icon name="chevron-right" size={9} color={colors.label3} />
            </Chip>
          </Pressable>
          {pet.sex ? <Chip>{pet.sex === "male" ? "Male" : "Female"}</Chip> : null}
          <Chip>{`${pet.owned.length} items`}</Chip>
        </View>
        <View style={styles.heroButtons}>
          <AccentButton variant="tinted" size="sm" style={styles.heroButton} onPress={() => router.push("/(tabs)/pets")}>
            <Icon name="sparkles" size={16} color={colors.accent} />
            <Text style={styles.heroButtonLabel}>Dress up</Text>
          </AccentButton>
          <AccentButton variant="tinted" size="sm" style={styles.heroButton} onPress={() => router.push(`/pet/${pet.id}/card`)}>
            <Icon name="shield" size={16} color={colors.accent} />
            <Text style={styles.heroButtonLabel}>Pet card</Text>
          </AccentButton>
        </View>
      </View>

      {/* Weight */}
      <SectionHeader>Weight</SectionHeader>
      <View style={styles.weightCard}>
        <PixelChart points={pet.weights} target={target} units={state.units} onAddWeight={() => setEditing("weight")} />
        {feedingGuide ? (
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
        ) : null}
        <Pressable onPress={() => setHistoryOpen((v) => !v)} style={styles.historyToggle} hitSlop={4}>
          <Text style={styles.historyToggleLabel}>History · {pet.weights.length} entries</Text>
          <View style={historyOpen ? { transform: [{ rotate: "90deg" }] } : undefined}>
            <Icon name="chevron-right" size={13} color={colors.label3} />
          </View>
        </Pressable>
        {historyOpen ? (
          <View style={{ marginTop: 4 }}>
            {[...pet.weights]
              .sort((a, b) => b.ts - a.ts)
              .slice(0, 10)
              .map((w) => (
                <View key={w.id} style={styles.historyRow}>
                  <Text style={styles.historyDate}>{fmtDate(w.ts)}</Text>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyWeight}>{formatWeight(w.kg, state.units)}</Text>
                    <Pressable
                      onPress={() => deleteWeight(pet.id, w.id)}
                      accessibilityLabel={`Delete weight entry from ${fmtDate(w.ts)}`}
                      hitSlop={10}
                      style={({ pressed }) => [styles.smallDelete, pressed && { backgroundColor: colors.fill }]}
                    >
                      <Icon name="xmark" size={13} color={colors.label3} />
                    </Pressable>
                  </View>
                </View>
              ))}
            <Pressable
              onPress={() => {
                setBfWeight("");
                setBfDate(null);
                setBackfillOpen(true);
              }}
              hitSlop={6}
              style={({ pressed }) => [styles.backfillLink, pressed && { opacity: 0.6 }]}
            >
              <Icon name="plus" size={13} color={colors.accent} />
              <Text style={styles.backfillLabel}>Add for a past date</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* Identity */}
      <SectionHeader>Identity</SectionHeader>
      <Group>
        <Row
          leading={<IconCircle icon="person" tint={colors.label2} bg={colors.fill} />}
          title="Sex"
          subtitle="Used for the age-and-sex-specific weight & feeding guide"
          trailing={
            <Text style={pet.sex ? styles.identityValue : styles.identityUnset}>
              {pet.sex === "male" ? "Male" : pet.sex === "female" ? "Female" : "Set"}
            </Text>
          }
          onPress={() => {
            setSexVal(pet.sex ?? "unset");
            setSexOpen(true);
          }}
        />
        <Row
          leading={<IconCircle icon="gift" tint={colors.orange} bg={colors.orangeSoft} />}
          title="Birth date"
          subtitle="With a birth date set, age is calculated automatically"
          trailing={
            <Text style={pet.birthDate != null ? styles.identityValue : styles.identityUnset}>
              {pet.birthDate != null ? fmtDate(pet.birthDate) : "Set"}
            </Text>
          }
          onPress={() => {
            setBirthdayTs(pet.birthDate ?? null);
            setBirthdayOpen(true);
          }}
        />
        <Row
          leading={<IconCircle icon="pin" tint={colors.accent} bg={colors.accentSoft} />}
          title="Microchip"
          subtitle={pet.microchip ?? "Add the chip number for the emergency card"}
          trailing={<Text style={pet.microchip ? styles.identityValue : styles.identityUnset}>{pet.microchip ? "Edit" : "Set"}</Text>}
          onPress={() => setIdentityEditing("microchip")}
        />
        <Row
          leading={<IconCircle icon="alert" tint={colors.red} bg={colors.redSoft} />}
          title="Allergies & alerts"
          subtitle={pet.allergies ?? "e.g. Chicken allergy, sensitive stomach"}
          trailing={<Text style={pet.allergies ? styles.identityValue : styles.identityUnset}>{pet.allergies ? "Edit" : "Set"}</Text>}
          onPress={() => setIdentityEditing("allergies")}
        />
        <Row
          leading={<IconCircle icon="list" tint={colors.label2} bg={colors.fill} />}
          title="Notes"
          subtitle={pet.notes ?? "Anything the family or a sitter should know"}
          trailing={<Text style={pet.notes ? styles.identityValue : styles.identityUnset}>{pet.notes ? "Edit" : "Set"}</Text>}
          onPress={() => setIdentityEditing("notes")}
        />
      </Group>

      {/* Supplies */}
      <SectionHeader>Supplies</SectionHeader>
      <Group>
        {pet.supplies.map((s) => {
          const low = s.level < 20;
          return (
            <Row
              key={s.id}
              leading={<IconCircle icon={s.icon as never} tint={low ? colors.red : colors.label2} bg={low ? colors.redSoft : colors.fill} />}
              title={s.name}
              subtitle={
                <View style={styles.supplyMeter}>
                  <View style={styles.supplyTrack}>
                    <View style={[styles.supplyFill, { width: `${s.level}%`, backgroundColor: low ? colors.red : colors.green }]} />
                  </View>
                  <Text style={[styles.supplyLevel, low && styles.supplyLevelLow]}>
                    {s.level}%{low ? " · low" : ""}
                  </Text>
                </View>
              }
              trailing={
                s.level < 100 ? (
                  <Pressable
                    onPress={() => {
                      restockSupply(pet.id, s.id);
                      toast("box", `${s.name} restocked`, "Back to 100%");
                    }}
                    hitSlop={8}
                    style={({ pressed }) => [styles.restockButton, pressed && { transform: [{ scale: 0.95 }] }]}
                  >
                    <Icon name="refresh" size={12} color={colors.accent} />
                    <Text style={styles.restockLabel}>Restock</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.fullLabel}>Full</Text>
                )
              }
            />
          );
        })}
      </Group>

      {/* Medications */}
      <Meds pet={pet} />

      {/* Vaccinations */}
      <SectionHeader
        trailing={
          <Pressable
            onPress={() => {
              setVaccName("");
              setVaccGiven(null);
              setVaccNext(null);
              setVaccOpen(true);
            }}
            hitSlop={10}
            style={({ pressed }) => (pressed ? { opacity: 0.6 } : undefined)}
          >
            <Text style={styles.headerLink}>Add</Text>
          </Pressable>
        }
      >
        Vaccinations
      </SectionHeader>
      <Group>
        {pet.vaccinations.length === 0 ? (
          <Row
            leading={<IconCircle icon="syringe" tint={colors.label2} bg={colors.fill} />}
            title={<Text style={styles.mutedTitle}>No vaccinations on file</Text>}
            subtitle="Add records to get reminded before boosters are due"
          />
        ) : (
          pet.vaccinations.map((v) => {
            const overdue = v.nextDue != null && isPast(v.nextDue);
            return (
              <Row
                key={v.id}
                leading={
                  <IconCircle icon="syringe" tint={overdue ? colors.red : colors.accent} bg={overdue ? colors.redSoft : colors.accentSoft} />
                }
                title={v.name}
                subtitle={
                  <Text numberOfLines={1} style={[styles.rowSubtitle, overdue && styles.overdueSubtitle]}>
                    Given {fmtDate(v.dateGiven)}
                    {v.nextDue != null ? ` · ${overdue ? "was due" : "next"} ${fmtDate(v.nextDue)}` : ""}
                  </Text>
                }
                trailing={
                  <Pressable
                    onPress={() => deleteVaccination(pet.id, v.id)}
                    accessibilityLabel={`Delete ${v.name}`}
                    hitSlop={10}
                    style={({ pressed }) => [styles.smallDelete, pressed && { backgroundColor: colors.fill }]}
                  >
                    <Icon name="xmark" size={15} color={colors.label3} />
                  </Pressable>
                }
              />
            );
          })
        )}
      </Group>

      {/* Vet visits */}
      <SectionHeader
        trailing={
          <Pressable
            onPress={() => {
              setVisitDate(null);
              setVisitVet("");
              setVisitReason("");
              setVisitOpen(true);
            }}
            hitSlop={10}
            style={({ pressed }) => (pressed ? { opacity: 0.6 } : undefined)}
          >
            <Text style={styles.headerLink}>Log visit</Text>
          </Pressable>
        }
      >
        Vet visits
      </SectionHeader>
      <Group>
        {pet.vetVisits.length === 0 ? (
          <Row
            leading={<IconCircle icon="stethoscope" tint={colors.label2} bg={colors.fill} />}
            title={<Text style={styles.mutedTitle}>No visits on record</Text>}
            subtitle="Logged visits build the health history vets ask about"
          />
        ) : (
          pet.vetVisits.slice(0, 5).map((v) => (
            <Row
              key={v.id}
              leading={<IconCircle icon="stethoscope" tint={colors.vetTint} bg={colors.vetBg} />}
              title={v.reason || "Vet visit"}
              subtitle={`${v.vetName ? `${v.vetName} · ` : ""}${fmtDate(v.ts)}`}
              trailing={
                <Pressable
                  onPress={() => deleteVetVisit(pet.id, v.id)}
                  accessibilityLabel="Delete vet visit"
                  hitSlop={10}
                  style={({ pressed }) => [styles.smallDelete, pressed && { backgroundColor: colors.fill }]}
                >
                  <Icon name="xmark" size={15} color={colors.label3} />
                </Pressable>
              }
            />
          ))
        )}
      </Group>

      {/* Milestones */}
      <SectionHeader>Milestones</SectionHeader>
      <Group>
        {pet.birthDate != null ? (
          <Row
            leading={<IconCircle icon="gift" tint={colors.orange} bg={colors.orangeSoft} />}
            title={`Turns ${nextBirthday(pet.birthDate).turns} on ${fmtDate(nextBirthday(pet.birthDate).date)}`}
            subtitle={`Born ${fmtDate(pet.birthDate)}`}
          />
        ) : (
          <Row
            onPress={() => {
              setBirthdayTs(null);
              setBirthdayOpen(true);
            }}
            leading={<IconCircle icon="gift" tint={colors.label2} bg={colors.fill} />}
            title="Add a birth date"
            subtitle="Unlocks birthday milestones and age-accurate feeding guides"
            trailing={<Icon name="chevron-right" size={15} color={colors.label3} />}
          />
        )}
        <Row
          leading={<IconCircle icon="heart-text" tint={colors.accent} bg={colors.accentSoft} />}
          title={`Gotcha day — ${fmtDate(nextAnniversary(pet.createdAt))}`}
          subtitle={`In the family since ${fmtDate(pet.createdAt)}`}
        />
      </Group>

      {/* Plan summary */}
      {state.premium && plan ? (
        <>
          <SectionHeader
            trailing={
              <Pressable
                onPress={() => router.push("/(tabs)/plan")}
                hitSlop={10}
                style={({ pressed }) => (pressed ? { opacity: 0.6 } : undefined)}
              >
                <Text style={styles.headerLink}>Full plan</Text>
              </Pressable>
            }
          >
            Care plan
          </SectionHeader>
          <Group>
            {plan.items.slice(0, 4).map((item) => {
              const ai = item.action ? ACTION_ICON[item.action] : null;
              return (
                <Row
                  key={item.title}
                  leading={<IconCircle icon={(ai?.icon ?? "heart-text") as never} tint={ai?.tint ?? colors.label2} bg={ai?.bg ?? colors.fill} />}
                  title={item.title}
                  subtitle={item.cadence}
                />
              );
            })}
          </Group>
        </>
      ) : null}

      {/* Recent activity */}
      <SectionHeader
        trailing={
          <Pressable onPress={() => router.push("/activity")} hitSlop={10} style={({ pressed }) => (pressed ? { opacity: 0.6 } : undefined)}>
            <Text style={styles.headerLink}>All</Text>
          </Pressable>
        }
      >
        Recent activity
      </SectionHeader>
      <Group>
        {recent.map((a) => {
          const m = state.members.find((mm) => mm.id === a.memberId);
          const ai = ACTION_ICON[a.type];
          return (
            <Row
              key={a.id}
              leading={m ? <InitialAvatar name={m.name} gradient={m.gradient} size={34} /> : undefined}
              title={
                <Text numberOfLines={1} style={styles.activityTitle}>
                  <Text style={styles.activityWho}>{m?.id === state.currentMemberId ? "You" : m?.name}</Text>{" "}
                  <Text style={styles.activityVerb}>{ACTIONS[a.type].verb.replace(pet.name, "").trim()}</Text>
                </Text>
              }
              subtitle={timeAgo(a.ts)}
              trailing={<IconCircle icon={ai.icon} tint={ai.tint} bg={ai.bg} size={32} iconSize={16} />}
            />
          );
        })}
      </Group>

      {/* Emergency card */}
      <SectionHeader>Emergency</SectionHeader>
      <Group>
        <Row
          leading={<IconCircle icon="shield" tint={colors.red} bg={colors.redSoft} />}
          title="Emergency card"
          subtitle="ID, microchip, allergies, meds — ready to share"
          trailing={<Icon name="chevron-right" size={15} color={colors.label3} />}
          onPress={() => router.push(`/pet/${pet.id}/card`)}
        />
      </Group>

      {/* Delete */}
      <Group style={{ marginTop: 28 }}>
        <ConfirmRow
          label="Delete pet"
          confirmLabel={`Tap again to delete ${pet.name}`}
          onConfirm={() => {
            const name = pet.name;
            deletePet(pet.id);
            router.back();
            toast("person", `${name} was removed`, "");
          }}
        />
      </Group>
      <View style={{ height: 16 }} />

      <EditStatSheet
        open={editing === "weight"}
        onClose={() => setEditing(null)}
        title={`${pet.name}'s weight`}
        label={`Weight (${weightUnitLabel(state.units)})`}
        initialValue={kgToUnit(pet.weightKg, state.units)}
        onSave={(v) => {
          const kg = unitToKg(v, state.units);
          addWeight(pet.id, kg);
          toast("scale", `${pet.name}'s weight updated`, formatWeight(kg, state.units));
        }}
      />

      <EditStatSheet
        open={editing === "age"}
        onClose={() => setEditing(null)}
        title={`${pet.name}'s age`}
        label="Age (years)"
        initialValue={pet.ageYears}
        onSave={(ageYears) => {
          editPet(pet.id, { ...basePatch, ageYears });
          toast("calendar", `${pet.name}'s age updated`, formatAge(ageYears));
        }}
      />

      <EditTextSheet
        open={identityEditing === "microchip"}
        onClose={() => setIdentityEditing(null)}
        title={`${pet.name}'s microchip`}
        label="Microchip number"
        placeholder="e.g. 985112003456789"
        initialValue={pet.microchip}
        onSave={(v) => {
          editPet(pet.id, { ...basePatch, microchip: v });
          toast("paw", `${pet.name} updated`, "Microchip saved");
        }}
      />

      <EditTextSheet
        open={identityEditing === "allergies"}
        onClose={() => setIdentityEditing(null)}
        title="Allergies & alerts"
        label="Allergies & alerts"
        placeholder="e.g. Chicken allergy, sensitive stomach"
        initialValue={pet.allergies}
        onSave={(v) => {
          editPet(pet.id, { ...basePatch, allergies: v });
          toast("paw", `${pet.name} updated`, "Allergies & alerts saved");
        }}
      />

      <EditTextSheet
        open={identityEditing === "notes"}
        onClose={() => setIdentityEditing(null)}
        title={`Notes about ${pet.name}`}
        label="Notes"
        placeholder="Anything the family or a sitter should know"
        initialValue={pet.notes}
        onSave={(v) => {
          editPet(pet.id, { ...basePatch, notes: v });
          toast("paw", `${pet.name} updated`, "Notes saved");
        }}
      />

      <Sheet open={sexOpen} onClose={() => setSexOpen(false)}>
        <Text style={styles.sheetTitle}>{pet.name}&apos;s sex</Text>
        <Text style={styles.sheetSubtitle}>Used for the age-and-sex-specific weight &amp; feeding guide</Text>
        <View style={{ marginTop: 20 }}>
          <Segmented
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
              { value: "unset", label: "Not set" },
            ]}
            value={sexVal}
            onChange={setSexVal}
          />
        </View>
        <View style={styles.sheetFooter}>
          <AccentButton
            onPress={() => {
              editPet(pet.id, { ...basePatch, sex: sexVal === "unset" ? null : sexVal });
              setSexOpen(false);
              toast("paw", `${pet.name} updated`, "");
            }}
          >
            Save
          </AccentButton>
        </View>
      </Sheet>

      <Sheet open={vaccOpen} onClose={() => setVaccOpen(false)}>
        <Text style={styles.sheetTitle}>Add vaccination</Text>
        <Text style={styles.sheetSubtitle}>For {pet.name} — from the vaccine booklet or vet record</Text>

        <Text style={styles.fieldLabel}>Vaccine</Text>
        <TextInput
          value={vaccName}
          onChangeText={setVaccName}
          placeholder="e.g. Rabies, FVRCP, DHPP…"
          placeholderTextColor={colors.label3}
          style={styles.input}
        />

        <Text style={styles.fieldLabel}>Date given</Text>
        <DateField value={vaccGiven} onChange={setVaccGiven} mode="past" />

        <Text style={styles.fieldLabel}>Next due (optional)</Text>
        <DateField value={vaccNext} onChange={setVaccNext} mode="future" allowClear />
        <Text style={styles.fieldHint}>With a next-due date, a reminder is created for the family automatically.</Text>

        <View style={styles.sheetFooter}>
          <AccentButton
            disabled={!vaccName.trim() || vaccGiven == null}
            onPress={() => {
              if (vaccGiven == null) return;
              if (vaccGiven > Date.now()) {
                toast("alert", "That date is in the future", "Pick today or an earlier date");
                return;
              }
              const nextDue = vaccNext ?? undefined;
              addVaccination(pet.id, { name: vaccName.trim(), dateGiven: vaccGiven, nextDue });
              setVaccOpen(false);
              toast("syringe", "Vaccination saved", nextDue != null ? "We'll remind you before it's due again" : vaccName.trim());
            }}
          >
            Save vaccination
          </AccentButton>
        </View>
      </Sheet>

      <Sheet open={visitOpen} onClose={() => setVisitOpen(false)}>
        <Text style={styles.sheetTitle}>Log a vet visit</Text>
        <Text style={styles.sheetSubtitle}>Builds {pet.name}&apos;s health history</Text>

        <Text style={styles.fieldLabel}>Date</Text>
        <DateField value={visitDate} onChange={setVisitDate} mode="past" />

        <Text style={styles.fieldLabel}>Reason (optional)</Text>
        <TextInput
          value={visitReason}
          onChangeText={setVisitReason}
          placeholder="e.g. Annual checkup, limping, dental…"
          placeholderTextColor={colors.label3}
          style={styles.input}
        />

        <Text style={styles.fieldLabel}>Vet or clinic (optional)</Text>
        <TextInput
          value={visitVet}
          onChangeText={setVisitVet}
          placeholder="e.g. Dr. Weber, Happy Paws Clinic"
          placeholderTextColor={colors.label3}
          style={styles.input}
        />

        <View style={styles.sheetFooter}>
          <AccentButton
            disabled={visitDate == null}
            onPress={() => {
              if (visitDate == null) return;
              if (visitDate > Date.now()) {
                toast("alert", "That date is in the future", "Pick today or an earlier date");
                return;
              }
              addVetVisit(pet.id, { ts: visitDate, vetName: visitVet.trim() || undefined, reason: visitReason.trim() || undefined });
              setVisitOpen(false);
              toast("stethoscope", "Vet visit logged", visitReason.trim() || fmtDate(visitDate));
            }}
          >
            Save visit
          </AccentButton>
        </View>
      </Sheet>

      <Sheet open={birthdayOpen} onClose={() => setBirthdayOpen(false)}>
        <Text style={styles.sheetTitle}>{pet.name}&apos;s birth date</Text>
        <Text style={styles.sheetSubtitle}>Age updates automatically from now on</Text>

        <Text style={styles.fieldLabel}>Born</Text>
        <DateField value={birthdayTs} onChange={setBirthdayTs} mode="past" />

        <View style={styles.sheetFooter}>
          <AccentButton
            disabled={birthdayTs == null}
            onPress={() => {
              if (birthdayTs == null) return;
              if (birthdayTs > Date.now()) {
                toast("alert", "That date is in the future", "Pick the actual birth date");
                return;
              }
              editPet(pet.id, { ...basePatch, birthDate: birthdayTs });
              setBirthdayOpen(false);
              toast("gift", "Birth date saved", `Born ${fmtDate(birthdayTs)}`);
            }}
          >
            Save
          </AccentButton>
        </View>
      </Sheet>

      <Sheet open={backfillOpen} onClose={() => setBackfillOpen(false)}>
        <Text style={styles.sheetTitle}>Past weight entry</Text>
        <Text style={styles.sheetSubtitle}>For {pet.name} — from an old vet note or memory</Text>

        <Text style={styles.fieldLabel}>Weight ({weightUnitLabel(state.units)})</Text>
        <TextInput
          keyboardType="decimal-pad"
          inputMode="decimal"
          value={bfWeight}
          onChangeText={setBfWeight}
          style={styles.input}
        />

        <Text style={styles.fieldLabel}>Date</Text>
        <DateField value={bfDate} onChange={setBfDate} mode="past" />

        <View style={styles.sheetFooter}>
          <AccentButton
            disabled={bfDate == null || bfWeight.trim() === "" || !Number.isFinite(Number(bfWeight)) || Number(bfWeight) <= 0}
            onPress={() => {
              if (bfDate == null) return;
              const kg = unitToKg(Number(bfWeight), state.units);
              if (bfDate > Date.now()) {
                toast("alert", "That date is in the future", "Pick today or an earlier date");
                return;
              }
              addWeight(pet.id, kg, bfDate);
              setBackfillOpen(false);
              toast("scale", "Weight entry added", `${formatWeight(kg, state.units)} · ${fmtDate(bfDate)}`);
            }}
          >
            Add entry
          </AccentButton>
        </View>
      </Sheet>
    </PushedScreen>
  );
}

const styles = StyleSheet.create({
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 80 },
  notFoundTitle: { fontSize: 15, fontFamily: font.semibold, color: colors.label },
  notFoundLink: { marginTop: 12, fontSize: 14, fontFamily: font.semibold, color: colors.accent },
  hero: {
    alignItems: "center",
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingVertical: 24,
    ...cardShadow,
  },
  heroName: { marginTop: 12, fontSize: 24, fontFamily: font.bold, letterSpacing: -0.5, color: colors.label },
  heroBreed: { fontSize: 14, fontFamily: font.medium, color: colors.label2 },
  chipRow: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6 },
  chipText: { fontSize: 12, fontFamily: font.medium, color: colors.label2 },
  heroButtons: { marginTop: 16, width: "100%", maxWidth: 320, flexDirection: "row", gap: 8 },
  heroButton: { flex: 1, minWidth: 0 },
  heroButtonLabel: { fontSize: 15, fontFamily: font.semibold, color: colors.accent },
  weightCard: { borderRadius: radius.md, backgroundColor: colors.card, padding: 16, ...cardShadow },
  guideGrid: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.sep,
    flexDirection: "row",
    gap: 8,
  },
  guideCell: { flex: 1, alignItems: "center" },
  guideLabel: { fontSize: 11, fontFamily: font.medium, color: colors.label2 },
  guideValue: { marginTop: 1, fontSize: 13, fontFamily: font.semibold, color: colors.label, textAlign: "center" },
  historyToggle: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.sep,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 32,
  },
  historyToggleLabel: { fontSize: 13, fontFamily: font.semibold, color: colors.label2 },
  historyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  historyDate: { fontSize: 13, fontFamily: font.regular, color: colors.label2 },
  historyRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  historyWeight: { fontSize: 13, fontFamily: font.semibold, color: colors.label },
  smallDelete: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  backfillLink: { marginTop: 4, flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
  backfillLabel: { fontSize: 13, fontFamily: font.semibold, color: colors.accent },
  identityValue: { fontSize: 13, fontFamily: font.semibold, color: colors.label },
  identityUnset: { fontSize: 13, fontFamily: font.semibold, color: colors.label3 },
  supplyMeter: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 },
  supplyTrack: { height: 6, width: 96, borderRadius: 3, backgroundColor: colors.fill, overflow: "hidden" },
  supplyFill: { height: "100%", borderRadius: 3 },
  supplyLevel: { fontSize: 13, fontFamily: font.regular, color: colors.label2 },
  supplyLevelLow: { fontFamily: font.semibold, color: colors.red },
  restockButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.full,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  restockLabel: { fontSize: 12, fontFamily: font.semibold, color: colors.accent },
  fullLabel: { fontSize: 12, fontFamily: font.semibold, color: colors.green },
  headerLink: { fontSize: 13, fontFamily: font.semibold, color: colors.accent },
  mutedTitle: { fontSize: 16, fontFamily: font.medium, color: colors.label2 },
  rowSubtitle: { fontSize: 13, fontFamily: font.regular, color: colors.label2, marginTop: 1 },
  overdueSubtitle: { fontFamily: font.semibold, color: colors.red },
  activityTitle: { fontSize: 16 },
  activityWho: { fontFamily: font.semibold, color: colors.label },
  activityVerb: { fontFamily: font.regular, color: colors.label2 },
  sheetTitle: { fontSize: 20, fontFamily: font.bold, letterSpacing: -0.2, color: colors.label },
  sheetSubtitle: { marginTop: 2, fontSize: 13, fontFamily: font.regular, color: colors.label2 },
  fieldLabel: {
    marginTop: 20,
    marginBottom: 6,
    fontSize: 13,
    fontFamily: font.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: colors.label2,
  },
  fieldHint: { marginTop: 6, paddingHorizontal: 4, fontSize: 12, fontFamily: font.regular, color: colors.label3 },
  input: {
    borderRadius: 12,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: font.medium,
    color: colors.label,
    ...cardShadow,
  },
  sheetFooter: { marginTop: 28 },
});
