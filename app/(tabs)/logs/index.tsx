import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";
import ActivityRow from "@/components/ActivityRow";
import DurationPickerSheet from "@/components/DurationPickerSheet";
import EmptyState from "@/components/EmptyState";
import FeedPortionSheet from "@/components/FeedPortionSheet";
import HeaderActions from "@/components/HeaderActions";
import MedPickerSheet from "@/components/MedPickerSheet";
import PageLoading from "@/components/PageLoading";
import ScheduleEditorSheet from "@/components/ScheduleEditorSheet";
import { TabScreen } from "@/components/Screen";
import Sheet from "@/components/Sheet";
import { TimeWheelPicker } from "@/components/WheelPicker";
import CareTile from "@/components/logs/CareTile";
import HouseholdToday from "@/components/logs/HouseholdToday";
import PetChoicePanel, { PetChoiceRow } from "@/components/logs/PetChoice";
import { ACTION_ICON, Icon } from "@/components/Icons";
import {
  AccentButton,
  Chevron,
  FieldLabel,
  Group,
  IconCircle,
  PressableScale,
  Row,
  SectionHeader,
  Segmented,
  SelectableChip,
  SheetFooter,
  SheetSubtitle,
  SheetTitle,
  TextField,
} from "@/components/ui";
import { findSchedule } from "@/lib/careStatus";
import { householdLevers, leverApplies, petDayProgress, petStateLine, summarizeLever } from "@/lib/careDashboard";
import { ACTIONS, type ActionType, type Pet } from "@/lib/data";
import { useStore } from "@/lib/store";
import { font, useColors, type Colors } from "@/lib/theme";
import { usePullToRefresh } from "@/lib/useRefresh";

/** Levers that need nothing beyond "which pet", so one tap can cover the herd. */
const BULK_LOGGABLE: ActionType[] = ["water", "litter", "groomed"];

/** What tapping a tile is trying to do. */
type Intent = "log" | "schedule";

/**
 * A sheet plus the thing it is about. The data outlives `open` on purpose:
 * clearing it on dismiss would unmount the sheet mid-animation and it would
 * vanish instead of sliding away.
 */
function useSheetTarget<T>() {
  const [data, setData] = useState<T | null>(null);
  const [open, setOpen] = useState(false);
  return {
    data,
    open,
    present: (d: T) => {
      setData(d);
      setOpen(true);
    },
    dismiss: () => setOpen(false),
  };
}

/**
 * Logs — a household care dashboard.
 *
 * The page used to be a per-pet list behind a pet picker: pick Milo, read six
 * rows, pick Luna, read six more. It is now one grid of levers covering every
 * pet at once. Each tile is a care action; its body logs, its corner calendar
 * schedules, and the pet is chosen inside whichever of those you asked for,
 * from a row of avatars big enough to hit without looking.
 */
export default function LogsScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { state, hydrated, logAction, undoLogAction, addVetVisit, toast } = useStore();
  const refreshControl = usePullToRefresh();
  const router = useRouter();

  const [pending, setPending] = useState<{ type: ActionType; intent: Intent } | null>(null);
  const [justLogged, setJustLogged] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const feed = useSheetTarget<{ petId: string }>();
  const duration = useSheetTarget<{ petId: string }>();
  const medPicker = useSheetTarget<{ petId: string; adding: boolean }>();
  const editor = useSheetTarget<{ petId: string; type: ActionType; medId?: string }>();
  const vetDetail = useSheetTarget<{ petId: string }>();

  const [retroOpen, setRetroOpen] = useState(false);
  const [retroPetId, setRetroPetId] = useState("");
  const [retroType, setRetroType] = useState<ActionType | null>(null);
  const [retroMedId, setRetroMedId] = useState<string | null>(null);
  const [retroDay, setRetroDay] = useState<"today" | "yesterday">("today");
  const [retroTime, setRetroTime] = useState("");

  const [vetReason, setVetReason] = useState("");
  const [vetClinic, setVetClinic] = useState("");
  const vetClinicRef = useRef<TextInput>(null);

  const dayDoneRef = useRef<boolean | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(flashTimer.current), []);

  // Schedule states flip on time passing alone (grace windows, due slots) —
  // tick once a minute so the dashboard stays honest while the tab is open.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const pets = state.pets;
  const levers = useMemo(() => householdLevers(pets), [pets]);
  const summaries = useMemo(
    () => levers.map((type) => summarizeLever(type, pets, state.schedules, state.activities, now)),
    [levers, pets, state.schedules, state.activities, now]
  );

  const todays = useMemo(() => {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    return state.activities.filter((a) => a.ts >= startOfDay.getTime());
  }, [state.activities, now]);

  // Open reminders across the household, so the Reminders row can say what is
  // waiting instead of being a blind link.
  const reminderSummary = useMemo(() => {
    const open = state.reminders.filter((r) => !r.done);
    return { open: open.length, overdue: open.filter((r) => r.due < now).length };
  }, [state.reminders, now]);

  // "All caught up" — fires once when every lever asking for something today
  // has been answered, for every pet.
  useEffect(() => {
    if (pets.length === 0) return;
    const totals = pets.reduce(
      (acc, p) => {
        const r = petDayProgress(p, summaries);
        return { required: acc.required + r.required, done: acc.done + r.done };
      },
      { required: 0, done: 0 }
    );
    const dayDone = totals.required > 0 && totals.done >= totals.required;
    const prev = dayDoneRef.current;
    if (prev === false && dayDone) toast("star", "All caught up today!", "Every pet's care is done for today");
    dayDoneRef.current = dayDone;
    // summaries is the whole input; petDayProgress is pure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaries]);

  const petById = (id: string): Pet | undefined => pets.find((p) => p.id === id);

  if (!hydrated)
    return (
      <TabScreen title="Logs" subtitle="The whole household, at a glance" trailing={<HeaderActions />} refreshControl={refreshControl}>
        <PageLoading />
      </TabScreen>
    );
  if (pets.length === 0) {
    return (
      <TabScreen title="Logs" subtitle="The whole household, at a glance" trailing={<HeaderActions />} refreshControl={refreshControl}>
        <View style={{ marginTop: 16 }}>
          <EmptyState icon="list" title="No pets yet" body="Add your first pet to start logging care." cta="Add a pet" onCta={() => router.push("/pet/new")} />
        </View>
      </TabScreen>
    );
  }

  const flash = (key: string) => {
    setJustLogged(key);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setJustLogged(null), 900);
  };

  const successHaptic = () => {
    if (Platform.OS === "ios") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  /** Which pets a tile's chooser should offer. Meds with nothing tracked yet
   *  offers everyone, because the next step is starting one. */
  const targetsFor = (type: ActionType): Pet[] => {
    const applies = pets.filter((p) => leverApplies(p, type));
    return type === "meds" && applies.length === 0 ? pets : applies;
  };

  const logFor = (type: ActionType, petId: string) => {
    const pet = petById(petId);
    if (!pet) return;
    if (type === "fed") {
      feed.present({ petId });
      return;
    }
    // Exercise & play is a measured log, like feeding: ask how long first.
    if (type === "walk") {
      duration.present({ petId });
      return;
    }
    if (type === "meds") {
      if (pet.meds.length === 0) medPicker.present({ petId, adding: true });
      else if (pet.meds.length === 1) {
        if (logAction(pet.id, "meds", undefined, undefined, pet.meds[0].id)) flash("meds");
      } else medPicker.present({ petId, adding: false });
      return;
    }
    if (logAction(pet.id, type)) {
      flash(type);
      // A vet tap naturally produces a health-history record — offer the
      // details right away, skippable.
      if (type === "vet") {
        setVetReason("");
        setVetClinic("");
        vetDetail.present({ petId });
      }
    }
  };

  const scheduleFor = (type: ActionType, petId: string) => {
    const pet = petById(petId);
    if (!pet) return;
    if (type === "meds") {
      // A schedule belongs to one medication, and picking which one would mean
      // a sheet on top of a sheet. The medications screen already lists them,
      // each row opening this same editor.
      if (pet.meds.length === 1) editor.present({ petId, type, medId: pet.meds[0].id });
      else router.push({ pathname: "/medications", params: { petId } });
      return;
    }
    editor.present({ petId, type });
  };

  /** Tile tap. One pet in play means no chooser at all — the common case. */
  const start = (type: ActionType, intent: Intent) => {
    if (pending?.type === type && pending.intent === intent) {
      setPending(null);
      return;
    }
    const targets = targetsFor(type);
    if (targets.length === 0) return;
    if (targets.length === 1) {
      setPending(null);
      if (intent === "log") logFor(type, targets[0].id);
      else scheduleFor(type, targets[0].id);
      return;
    }
    setPending({ type, intent });
  };

  const logForEveryone = (type: ActionType) => {
    setPending(null);
    const targets = targetsFor(type);
    const n = targets.filter((p) => logAction(p.id, type)).length;
    if (n > 0) {
      successHaptic();
      flash(type);
    }
  };

  const retroPet = petById(retroPetId) ?? pets[0];
  const retroActions: ActionType[] = [
    "fed",
    "water",
    ...(retroPet.species === "cat" ? (["litter"] as ActionType[]) : (["walk"] as ActionType[])),
    "groomed",
    ...(retroPet.meds.length > 0 ? (["meds"] as ActionType[]) : []),
    "vet",
  ];

  // Timestamp for the retro-log sheet. The wheel always yields a valid "HH:MM",
  // so the only failure left is picking a time that hasn't happened yet.
  const retroTimestamp = (() => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(retroTime);
    if (!m) return null;
    const d = new Date();
    if (retroDay === "yesterday") d.setDate(d.getDate() - 1);
    d.setHours(Number(m[1]), Number(m[2]), 0, 0);
    const ts = d.getTime();
    return ts > Date.now() ? null : ts;
  })();
  const retroNeedsMed = retroType === "meds" && retroPet.meds.length > 1 && retroMedId == null;
  const retroTypeValid = retroType != null && retroActions.includes(retroType);

  const openRetro = () => {
    setRetroPetId(pets[0].id);
    setRetroType(null);
    setRetroMedId(null);
    setRetroDay("today");
    // Seed the wheel at the current time — the common case is "I did this a
    // little while ago", so the user spins back rather than starting blank.
    // Floored to the wheel's 5-minute grid so the row it parks on IS the value
    // that gets logged (and stays in the past).
    const d = new Date();
    const m5 = d.getMinutes() - (d.getMinutes() % 5);
    setRetroTime(`${String(d.getHours()).padStart(2, "0")}:${String(m5).padStart(2, "0")}`);
    setRetroOpen(true);
  };

  const pendingIndex = pending ? levers.indexOf(pending.type) : -1;
  const pendingSummary = pending ? summaries[pendingIndex] : undefined;
  const feedPet = feed.data ? petById(feed.data.petId) : undefined;
  const durationPet = duration.data ? petById(duration.data.petId) : undefined;
  const medPickerPet = medPicker.data ? petById(medPicker.data.petId) : undefined;
  const editorPet = editor.data ? petById(editor.data.petId) : undefined;
  const vetDetailPet = vetDetail.data ? petById(vetDetail.data.petId) : undefined;

  return (
    <TabScreen title="Logs" subtitle="The whole household, at a glance" trailing={<HeaderActions />} refreshControl={refreshControl}>
      <HouseholdToday pets={pets} summaries={summaries} onPetPress={(id) => router.push(`/pet/${id}`)} />

      <SectionHeader>Right now</SectionHeader>
      <View style={styles.grid}>
        {levers
          .reduce<ActionType[][]>((rows, type, i) => {
            if (i % 2 === 0) rows.push([type]);
            else rows[rows.length - 1].push(type);
            return rows;
          }, [])
          .map((row, ri) => {
            const panelHere = pendingIndex >= 0 && Math.floor(pendingIndex / 2) === ri;
            return (
              <Fragment key={row.join("-")}>
                <View style={styles.gridRow}>
                  {row.map((type) => {
                    const i = levers.indexOf(type);
                    return (
                      <CareTile
                        key={type}
                        summary={summaries[i]}
                        expanded={pending?.type === type}
                        justLogged={justLogged === type}
                        now={now}
                        onLog={() => start(type, "log")}
                        onSchedule={() => start(type, "schedule")}
                      />
                    );
                  })}
                  {/* An odd lever count must not stretch the last tile to full
                      width — the grid's rhythm is the point. */}
                  {row.length === 1 ? <View style={styles.gridFiller} /> : null}
                </View>
                {panelHere && pending && pendingSummary ? (
                  <PetChoicePanel
                    caretSide={pendingIndex % 2 === 0 ? "left" : "right"}
                    onDismiss={() => setPending(null)}
                    title={
                      pending.intent === "log"
                        ? `Log ${ACTIONS[pending.type].label.toLowerCase()} for`
                        : `Set ${ACTIONS[pending.type].label.toLowerCase()} times for`
                    }
                  >
                    <PetChoiceRow
                      pets={targetsFor(pending.type)}
                      onPress={(petId) => {
                        setPending(null);
                        if (pending.intent === "log") logFor(pending.type, petId);
                        else scheduleFor(pending.type, petId);
                      }}
                      toneFor={
                        pending.intent === "log" ? (pet) => pendingSummary.pets.find((e) => e.pet.id === pet.id)?.tone : undefined
                      }
                      captionFor={(pet) => {
                        if (pending.intent === "schedule") {
                          return findSchedule(state.schedules, pet.id, pending.type) ? "Scheduled" : "No times yet";
                        }
                        const e = pendingSummary.pets.find((x) => x.pet.id === pet.id);
                        return e ? petStateLine(e, now) : "Not tracked";
                      }}
                      extra={
                        pending.intent === "log" && BULK_LOGGABLE.includes(pending.type) && targetsFor(pending.type).length > 1
                          ? { label: "Everyone", icon: "paw", onPress: () => logForEveryone(pending.type) }
                          : undefined
                      }
                    />
                  </PetChoicePanel>
                ) : null}
              </Fragment>
            );
          })}
      </View>
      <Text style={styles.gridHint}>Tap a tile to log it. The calendar in its corner sets the times everyone gets reminded about.</Text>

      {/* Reminders and the vet marketplace used to be reachable ONLY from the
          bell, which put them two taps behind an icon most people read as
          "notifications". They belong next to the care they relate to. */}
      <SectionHeader>Tasks &amp; care</SectionHeader>
      <Group>
        <Row
          onPress={openRetro}
          leading={<IconCircle icon="clock" tint={colors.accent} bg={colors.accentSoft} />}
          title={<Text style={styles.accentTitle}>Forgot to log something earlier?</Text>}
          subtitle="Backfill from earlier today or yesterday"
        />
        <Row
          onPress={() => router.push("/reminders")}
          leading={<IconCircle icon="bell" tint={colors.orange} bg={colors.orangeSoft} />}
          title="Reminders"
          subtitle={
            reminderSummary.open === 0
              ? "Nothing scheduled — tap to add one"
              : reminderSummary.overdue > 0
                ? `${reminderSummary.overdue} overdue · ${reminderSummary.open} open`
                : `${reminderSummary.open} open across the household`
          }
          trailing={<Chevron />}
        />
        <Row
          onPress={() => router.push("/medications")}
          leading={<IconCircle icon="pill" tint={colors.red} bg={colors.redSoft} />}
          title="Medication"
          trailing={<Chevron />}
        />
        <Row
          onPress={() => router.push("/vets")}
          leading={<IconCircle icon="cross" tint={colors.green} bg={colors.greenSoft} />}
          title="Find a vet"
          trailing={<Chevron />}
        />
      </Group>

      {/* Today's timeline — every pet, newest first. Capped at 6; the rest live
          behind "See all" so a busy household doesn't turn this into an
          endless scroll. */}
      <SectionHeader
        trailing={
          todays.length > 0 ? (
            <PressableScale onPress={() => router.push("/logs/all")} accessibilityRole="button" accessibilityLabel="See all logs" hitSlop={8}>
              <Text style={styles.seeAll}>See all</Text>
            </PressableScale>
          ) : undefined
        }
      >
        Today
      </SectionHeader>
      {todays.length > 0 ? (
        <Group>
          {todays.slice(0, 6).map((a) => {
            const pet = petById(a.petId);
            if (!pet) return null;
            return (
              <ActivityRow
                key={a.id}
                activity={a}
                pet={pet}
                member={state.members.find((m) => m.id === a.memberId)}
                isYou={a.memberId === state.currentMemberId}
                expanded={expandedLogId === a.id}
                onToggleExpand={() => setExpandedLogId(expandedLogId === a.id ? null : a.id)}
                onUndo={undoLogAction}
              />
            );
          })}
        </Group>
      ) : (
        <View style={styles.emptyToday}>
          <Text style={styles.emptyTodayText}>Nothing logged yet today — tap any tile above.</Text>
        </View>
      )}
      {todays.length > 6 ? (
        <AccentButton variant="tinted" size="sm" style={{ marginTop: 12 }} onPress={() => router.push("/logs/all")}>
          See all logs
        </AccentButton>
      ) : null}

      <Text style={styles.footnote}>
        Every action is shared with the family and shows up in Activity. Tap the bell any time to see what everyone&apos;s been up to.
      </Text>

      {/* Retro logging — backfill something from earlier today or yesterday. */}
      <Sheet open={retroOpen} onClose={() => setRetroOpen(false)}>
        <SheetTitle>Log an earlier action</SheetTitle>
        <SheetSubtitle>Backfill something that already happened</SheetSubtitle>

        {pets.length > 1 ? (
          <>
            <FieldLabel>Which pet</FieldLabel>
            <PetChoiceRow
              pets={pets}
              selectedId={retroPet.id}
              onPress={(petId) => {
                setRetroPetId(petId);
                setRetroMedId(null);
                const next = petById(petId);
                // Species and medication lists differ per pet — a carried-over
                // selection could log a litter change for a dog.
                if (next && retroType && !leverApplies(next, retroType)) setRetroType(null);
              }}
            />
          </>
        ) : null}

        <FieldLabel>What happened</FieldLabel>
        <View style={styles.chipsWrap}>
          {retroActions.map((type) => {
            const a = ACTION_ICON[type];
            const active = retroType === type;
            return (
              <SelectableChip
                key={type}
                label={ACTIONS[type].label}
                selected={active}
                onPress={() => {
                  setRetroType(type);
                  if (type !== "meds") setRetroMedId(null);
                }}
                leading={<Icon name={a.icon} size={14} color={active ? colors.white : colors.label} />}
              />
            );
          })}
        </View>

        {retroType === "meds" && retroPet.meds.length > 1 ? (
          <>
            <FieldLabel>Which med?</FieldLabel>
            <View style={styles.chipsWrap}>
              {retroPet.meds.map((m) => (
                <SelectableChip key={m.id} label={m.name} selected={retroMedId === m.id} onPress={() => setRetroMedId(m.id)} />
              ))}
            </View>
          </>
        ) : null}

        <FieldLabel>When</FieldLabel>
        <Segmented
          options={[
            { value: "today", label: "Earlier today" },
            { value: "yesterday", label: "Yesterday" },
          ]}
          value={retroDay}
          onChange={setRetroDay}
        />
        {/* 5-minute steps (the picker's default): backfilling doesn't need
            minute precision, and it cuts the minute wheel from 60 rows to 12. */}
        <TimeWheelPicker value={retroTime} onChange={setRetroTime} />
        {retroTimestamp == null ? <Text style={styles.retroHint}>That time hasn&apos;t happened yet — pick a time in the past.</Text> : null}

        <SheetFooter>
          <AccentButton
            disabled={!retroTypeValid || retroTimestamp == null || retroNeedsMed}
            onPress={() => {
              const ts = retroTimestamp;
              if (!retroType || !retroTypeValid || ts == null || retroNeedsMed) return;
              const medId = retroType === "meds" ? (retroMedId ?? retroPet.meds[0]?.id) : undefined;
              if (logAction(retroPet.id, retroType, undefined, ts, medId)) {
                successHaptic();
                setRetroOpen(false);
              }
            }}
          >
            Log it
          </AccentButton>
        </SheetFooter>
      </Sheet>

      {/* Vet visit details — offered right after logging a vet action. */}
      <Sheet open={vetDetail.open} onClose={vetDetail.dismiss}>
        <SheetTitle>Add visit details?</SheetTitle>
        <SheetSubtitle>Saved to {vetDetailPet?.name ?? "the pet"}&apos;s health history — skip if it was nothing</SheetSubtitle>

        <FieldLabel>Reason</FieldLabel>
        <TextField
          value={vetReason}
          onChangeText={setVetReason}
          placeholder="e.g. Annual checkup, vaccination…"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => vetClinicRef.current?.focus()}
        />

        <FieldLabel>Vet or clinic (optional)</FieldLabel>
        <TextField ref={vetClinicRef} value={vetClinic} onChangeText={setVetClinic} placeholder="e.g. Dr. Weber, Happy Paws Clinic" returnKeyType="done" />

        <SheetFooter>
          <View style={{ gap: 10 }}>
            <AccentButton
              disabled={!vetReason.trim() && !vetClinic.trim()}
              onPress={() => {
                if (!vetDetailPet) return;
                addVetVisit(vetDetailPet.id, { ts: Date.now(), reason: vetReason.trim() || undefined, vetName: vetClinic.trim() || undefined });
                successHaptic();
                vetDetail.dismiss();
                toast("stethoscope", "Visit saved", `${vetDetailPet.name}'s health history updated`);
              }}
            >
              Save details
            </AccentButton>
            <AccentButton variant="gray" onPress={vetDetail.dismiss}>
              Skip
            </AccentButton>
          </View>
        </SheetFooter>
      </Sheet>

      {durationPet ? (
        <DurationPickerSheet
          pet={durationPet}
          open={duration.open}
          onClose={duration.dismiss}
          onPick={(minutes) => {
            if (logAction(durationPet.id, "walk", undefined, undefined, undefined, minutes)) {
              successHaptic();
              flash("walk");
            }
          }}
        />
      ) : null}

      {feedPet ? (
        <FeedPortionSheet
          pet={feedPet}
          open={feed.open}
          onClose={feed.dismiss}
          presetGrams={summaries.find((s) => s.type === "fed")?.pets.find((p) => p.pet.id === feedPet.id)?.status.next?.grams}
          onLogged={() => {
            successHaptic();
            flash("fed");
          }}
        />
      ) : null}

      {medPickerPet ? (
        <MedPickerSheet
          pet={medPickerPet}
          open={medPicker.open}
          onClose={medPicker.dismiss}
          initialAdding={medPicker.data?.adding ?? false}
          onSelect={(medId) => {
            medPicker.dismiss();
            if (logAction(medPickerPet.id, "meds", undefined, undefined, medId)) flash("meds");
          }}
        />
      ) : null}

      {editorPet && editor.data ? (
        <ScheduleEditorSheet pet={editorPet} type={editor.data.type} medId={editor.data.medId} open={editor.open} onClose={editor.dismiss} />
      ) : null}
    </TabScreen>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    grid: { gap: 10 },
    gridRow: { flexDirection: "row", gap: 10, alignItems: "stretch" },
    gridFiller: { flex: 1 },
    gridHint: { marginTop: 10, paddingHorizontal: 4, fontSize: 12, fontFamily: font.regular, color: colors.label3, lineHeight: 17 },
    accentTitle: { fontSize: 16, fontFamily: font.semibold, color: colors.accent },
    retroHint: { marginTop: 8, fontSize: 13, fontFamily: font.regular, color: colors.red },
    seeAll: { fontSize: 14, fontFamily: font.semibold, color: colors.accent },
    emptyToday: { paddingHorizontal: 4, paddingVertical: 10 },
    emptyTodayText: { fontSize: 13, fontFamily: font.regular, color: colors.label2 },
    footnote: { marginTop: 16, paddingHorizontal: 4, fontSize: 13, fontFamily: font.regular, color: colors.label2, lineHeight: 20 },
    chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  });
