import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import ActivityRow from "@/components/ActivityRow";
import EmptyState from "@/components/EmptyState";
import { Icon } from "@/components/Icons";
import { FadeInItem } from "@/components/Motion";
import PageLoading from "@/components/PageLoading";
import PetSelectorRow from "@/components/PetSelectorRow";
import ScheduleEditorSheet from "@/components/ScheduleEditorSheet";
import { PushedScreen } from "@/components/Screen";
import Sheet from "@/components/Sheet";
import {
  AccentButton,
  ConfirmRow,
  FieldLabel,
  Footnote,
  Group,
  IconCircle,
  PressableScale,
  PRESS_SCALE_SMALL,
  Row,
  SectionHeader,
  SheetFooter,
  SheetSubtitle,
  SheetTitle,
  SmallButton,
  TextField,
} from "@/components/ui";
import { DEFAULT_MED_FREQUENCY, MED_FREQUENCIES, SingleWheelPicker } from "@/components/WheelPicker";
import {
  careItemStatus,
  describeSchedule,
  findSchedule,
  scheduleOccurrences,
  type CareState,
} from "@/lib/careStatus";
import type { Activity, Med, Pet } from "@/lib/data";
import { timeAgo, useStore } from "@/lib/store";
import { font, radius, useColors, withAlpha, type Colors } from "@/lib/theme";
import { usePullToRefresh } from "@/lib/useRefresh";

const DAY_MS = 86_400_000;
/** How much history the adherence strip covers. */
const STRIP_DAYS = 7;
const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Doses of one med. A `meds` log with no `med_id` — legacy rows, and retro logs
 * made before the pet had more than one prescription — counts toward a pet's
 * only med, exactly as `careItemStatus` treats it.
 */
function dosesOf(activities: Activity[], pet: Pet, medId: string): Activity[] {
  const sole = pet.meds.length === 1 && pet.meds[0].id === medId;
  return activities.filter(
    (a) => a.petId === pet.id && a.type === "meds" && (a.medId === medId || (a.medId == null && sole))
  );
}

/**
 * One dot per day. "pending" is today's not-yet-given dose — today can never be
 * "missed", the day isn't over; "off" is a day the schedule didn't ask for.
 */
type DayMark = "full" | "partial" | "missed" | "pending" | "extra" | "off";

export default function MedicationsScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { state, hydrated, addMed, editMed, deleteMed, logAction, undoLogAction, toast } = useStore();
  const { petId: paramPetId } = useLocalSearchParams<{ petId?: string }>();
  const [petId, setPetId] = useState(paramPetId ?? "");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const refreshControl = usePullToRefresh();

  /** null = closed, "new" = the add form, otherwise the med being edited. */
  const [editing, setEditing] = useState<Med | "new" | null>(null);
  // Kept separate so closing plays the sheet's exit animation instead of
  // yanking it off the tree — same pattern as components/Meds.tsx.
  const [scheduleMedId, setScheduleMedId] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const openSchedule = (medId: string) => {
    setScheduleMedId(medId);
    setScheduleOpen(true);
  };
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState(DEFAULT_MED_FREQUENCY);

  if (!hydrated) {
    return (
      <PushedScreen title="Medication" refreshControl={refreshControl}>
        <PageLoading />
      </PushedScreen>
    );
  }

  const activePetId = petId || paramPetId || state.pets[0]?.id || "";
  const pet = state.pets.find((p) => p.id === activePetId) ?? state.pets[0];
  const now = Date.now();

  const openAdd = () => {
    setName("");
    setDosage("");
    setFrequency(DEFAULT_MED_FREQUENCY);
    setEditing("new");
  };
  const openEdit = (med: Med) => {
    setName(med.name);
    setDosage(med.dosage ?? "");
    setFrequency(med.frequency || DEFAULT_MED_FREQUENCY);
    setEditing(med);
  };

  const valid = name.trim() !== "";
  const save = () => {
    if (!valid || !pet) return;
    const patch = {
      name: name.trim(),
      dosage: dosage.trim() || undefined,
      frequency: frequency.trim() || undefined,
    };
    if (editing === "new") {
      addMed(pet.id, patch.name, patch.dosage, patch.frequency);
      toast("pill", `${patch.name} added`, `${pet.name}'s medications`);
    } else if (editing) {
      editMed(pet.id, editing.id, patch);
    }
    setEditing(null);
  };

  const give = (med: Med) => {
    if (!pet) return;
    logAction(pet.id, "meds", undefined, undefined, med.id);
    toast("pill", `${med.name} given`, `Logged for ${pet.name}`);
  };

  const doses = pet
    ? state.activities.filter((a) => a.petId === pet.id && a.type === "meds").sort((a, b) => b.ts - a.ts)
    : [];

  return (
    <PushedScreen title="Medication" refreshControl={refreshControl}>
      <PetSelectorRow pets={state.pets} selectedId={activePetId} onSelect={setPetId} />

      {!pet ? (
        <EmptyState icon="pill" title="No pets yet" body="Add a pet first, then track their medications here." />
      ) : (
        <>
          <SectionHeader
            trailing={
              <PressableScale
                scaleTo={PRESS_SCALE_SMALL}
                onPress={openAdd}
                accessibilityRole="button"
                accessibilityLabel="Add medication"
                hitSlop={10}
              >
                <View style={styles.addLink}>
                  <Icon name="plus" size={14} color={colors.accent} />
                  <Text style={styles.addLinkLabel}>Add</Text>
                </View>
              </PressableScale>
            }
          >
            {pet.name}&apos;s medications
          </SectionHeader>

          {pet.meds.length === 0 ? (
            <EmptyState
              icon="pill"
              title="No medications yet"
              body={`Add anything ${pet.name} takes — a course of antibiotics, monthly flea treatment, a daily tablet.`}
            />
          ) : (
            <Group>
              {pet.meds.map((med) => {
                const schedule = findSchedule(state.schedules, pet.id, "meds", med.id);
                const status = careItemStatus(pet, "meds", med.id, state.schedules, state.activities, now);
                return (
                  <Row
                    key={med.id}
                    onPress={() => openEdit(med)}
                    interactiveTrailing
                    leading={<IconCircle icon="pill" tint={colors.red} bg={colors.redSoft} />}
                    title={med.name}
                    subtitle={
                      <View style={styles.subtitle}>
                        <Text numberOfLines={1} style={styles.subtitleText}>
                          {[med.dosage, schedule ? describeSchedule(schedule) : med.frequency]
                            .filter(Boolean)
                            .join(" · ") || "No schedule — tap to set one"}
                        </Text>
                        <StatusLine status={status.state} last={status.last?.ts} next={status.next?.ts} />
                      </View>
                    }
                    trailing={<SmallButton label="Give" tone="green" onPress={() => give(med)} />}
                  />
                );
              })}
            </Group>
          )}

          {pet.meds.length > 0 ? (
            <>
              <SectionHeader>Last 7 days</SectionHeader>
              <Group>
                {pet.meds.map((med) => (
                  <AdherenceRow
                    key={med.id}
                    pet={pet}
                    med={med}
                    activities={state.activities}
                    schedule={findSchedule(state.schedules, pet.id, "meds", med.id)}
                    now={now}
                    onPress={() => openSchedule(med.id)}
                  />
                ))}
              </Group>
              <Footnote>
                A filled dot means every scheduled dose that day was logged. Meds without a schedule count any dose as
                done — tap a medication to give it dose times.
              </Footnote>
            </>
          ) : null}

          <SectionHeader>Recent doses</SectionHeader>
          {doses.length === 0 ? (
            <EmptyState icon="clock" title="No doses logged" body={`Tap Give to record ${pet.name}'s first dose.`} />
          ) : (
            <Group>
              {doses.slice(0, 12).map((a, i) => (
                <FadeInItem key={a.id} index={i}>
                  <ActivityRow
                    activity={a}
                    pet={pet}
                    member={state.members.find((m) => m.id === a.memberId)}
                    isYou={a.memberId === state.currentMemberId}
                    expanded={expandedId === a.id}
                    onToggleExpand={() => setExpandedId(expandedId === a.id ? null : a.id)}
                    onUndo={undoLogAction}
                  />
                </FadeInItem>
              ))}
            </Group>
          )}
        </>
      )}

      <Sheet open={editing !== null} onClose={() => setEditing(null)}>
        <SheetTitle>{editing === "new" ? "New medication" : "Edit medication"}</SheetTitle>
        <SheetSubtitle>For {pet?.name ?? "your pet"}</SheetSubtitle>

        <FieldLabel>Name</FieldLabel>
        <TextField
          value={name}
          onChangeText={setName}
          placeholder="e.g. Flea treatment"
          returnKeyType="done"
          onSubmitEditing={save}
        />

        <FieldLabel>Dosage</FieldLabel>
        <TextField
          value={dosage}
          onChangeText={setDosage}
          placeholder="e.g. 1 tablet (optional)"
          returnKeyType="done"
          onSubmitEditing={save}
        />

        <FieldLabel>Frequency</FieldLabel>
        <SingleWheelPicker values={MED_FREQUENCIES} value={frequency} onChange={setFrequency} />

        {editing !== null && editing !== "new" ? (
          <View style={styles.sheetActions}>
            <Group>
              <Row
                onPress={() => {
                  const id = editing.id;
                  setEditing(null);
                  openSchedule(id);
                }}
                leading={<IconCircle icon="clock" tint={colors.accent} bg={colors.accentSoft} />}
                title="Dose times"
                subtitle="Set when this should be given"
              />
              <ConfirmRow
                label="Remove medication"
                confirmLabel="Tap again to remove"
                onConfirm={() => {
                  if (pet) deleteMed(pet.id, editing.id);
                  setEditing(null);
                }}
              />
            </Group>
          </View>
        ) : null}

        <SheetFooter>
          <AccentButton disabled={!valid} onPress={save}>
            {editing === "new" ? "Add medication" : "Save"}
          </AccentButton>
        </SheetFooter>
      </Sheet>

      {pet && scheduleMedId != null ? (
        <ScheduleEditorSheet
          pet={pet}
          type="meds"
          medId={scheduleMedId}
          open={scheduleOpen}
          onClose={() => setScheduleOpen(false)}
        />
      ) : null}
    </PushedScreen>
  );
}

/** "Overdue · last given 2d ago" — the one line that says whether to act. */
function StatusLine({ status, last, next }: { status: CareState; last?: number; next?: number }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const tone =
    status === "overdue" ? colors.red : status === "due" ? colors.orange : status === "done" ? colors.green : colors.label3;
  const head =
    status === "overdue"
      ? "Overdue"
      : status === "due"
        ? "Due now"
        : status === "done"
          ? "Done"
          : next != null
            ? `Next ${new Date(next).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
            : "No schedule";
  return (
    <View style={styles.statusLine}>
      <View style={[styles.statusDot, { backgroundColor: tone }]} />
      <Text numberOfLines={1} style={[styles.statusText, { color: tone }]}>
        {head}
        {last != null ? <Text style={styles.statusMuted}>{`  ·  last given ${timeAgo(last)}`}</Text> : null}
      </Text>
    </View>
  );
}

/**
 * A week of dots for one medication. Expected doses come from the schedule, so
 * an every-other-day course doesn't read as four missed days.
 */
function AdherenceRow({
  pet,
  med,
  activities,
  schedule,
  now,
  onPress,
}: {
  pet: Pet;
  med: Med;
  activities: Activity[];
  schedule: ReturnType<typeof findSchedule>;
  now: number;
  onPress: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const given = dosesOf(activities, pet, med.id);
  const today = startOfDay(now);

  const days = Array.from({ length: STRIP_DAYS }, (_, i) => {
    const dayStart = startOfDay(today - (STRIP_DAYS - 1 - i) * DAY_MS + DAY_MS / 2);
    const expected = schedule ? scheduleOccurrences(schedule, dayStart, DAY_MS).length : 0;
    const count = given.filter((a) => a.ts >= dayStart && a.ts < dayStart + DAY_MS).length;
    const isToday = dayStart === today;
    let mark: DayMark;
    if (expected === 0) mark = count > 0 ? "extra" : "off";
    else if (count >= expected) mark = "full";
    else if (count > 0) mark = "partial";
    else mark = isToday ? "pending" : "missed";
    return { key: dayStart, letter: DAY_LETTERS[new Date(dayStart).getDay()], mark };
  });

  const scored = days.filter((d) => d.mark === "full" || d.mark === "partial" || d.mark === "missed");
  const kept = scored.filter((d) => d.mark === "full").length;

  const fill = (mark: DayMark) =>
    mark === "full"
      ? colors.green
      : mark === "partial"
        ? colors.orange
        : mark === "extra"
          ? withAlpha(colors.green, 0.45)
          : "transparent";
  const border = (mark: DayMark) =>
    mark === "missed" ? colors.red : mark === "pending" ? colors.label3 : mark === "off" ? colors.sep : "transparent";

  return (
    <Row
      onPress={onPress}
      title={med.name}
      subtitle={
        <View style={styles.strip}>
          {days.map((d) => (
            <View key={d.key} style={styles.stripDay}>
              <View style={[styles.stripDot, { backgroundColor: fill(d.mark), borderColor: border(d.mark) }]} />
              <Text style={styles.stripLetter}>{d.letter}</Text>
            </View>
          ))}
          <Text style={styles.stripScore}>
            {scored.length === 0 ? "No schedule" : `${kept}/${scored.length} days`}
          </Text>
        </View>
      }
    />
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    addLink: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 24 },
    addLinkLabel: { fontSize: 13, fontFamily: font.semibold, color: colors.accent },
    subtitle: { gap: 3 },
    subtitleText: { fontSize: 13, fontFamily: font.regular, color: colors.label2 },
    statusLine: { flexDirection: "row", alignItems: "center", gap: 5 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 12, fontFamily: font.semibold },
    statusMuted: { fontFamily: font.regular, color: colors.label3 },
    strip: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 4 },
    stripDay: { alignItems: "center", gap: 3 },
    stripDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5 },
    stripLetter: { fontSize: 9, fontFamily: font.medium, color: colors.label3 },
    stripScore: { marginLeft: 6, fontSize: 11, fontFamily: font.medium, color: colors.label3 },
    sheetActions: { marginTop: 20, marginHorizontal: -4, borderRadius: radius.md, overflow: "hidden" },
  });
