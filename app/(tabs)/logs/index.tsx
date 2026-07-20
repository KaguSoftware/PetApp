import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";
import CareStatusRow from "@/components/CareStatusRow";
import EmptyState from "@/components/EmptyState";
import FeedPortionSheet from "@/components/FeedPortionSheet";
import HeaderActions from "@/components/HeaderActions";
import MedPickerSheet from "@/components/MedPickerSheet";
import { FadeInItem } from "@/components/Motion";
import PageLoading from "@/components/PageLoading";
import { InitialAvatar } from "@/components/PetAvatar";
import PetSelectorRow from "@/components/PetSelectorRow";
import ScheduleEditorSheet from "@/components/ScheduleEditorSheet";
import { TabScreen } from "@/components/Screen";
import Sheet from "@/components/Sheet";
import { ACTION_ICON, Icon } from "@/components/Icons";
import {
  AccentButton,
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
import { careItemStatus, type CareItemStatus } from "@/lib/careStatus";
import { ACTIONS, type ActionType } from "@/lib/data";
import { ALERT_VERB, useStore } from "@/lib/store";
import { colors, font } from "@/lib/theme";
import { usePullToRefresh } from "@/lib/useRefresh";

const CAT_ACTIONS: ActionType[] = ["fed", "water", "litter", "groomed"];
const DOG_ACTIONS: ActionType[] = ["fed", "water", "walk", "groomed"];

const ALERT_VERB_TYPES = Object.keys(ALERT_VERB) as ActionType[];
const CARE_WARNING_EMOJI: Partial<Record<string, ActionType>> = { "🍖": "fed", "💧": "water", "🧹": "litter", "🦮": "walk" };

/** One dashboard entry — a care action, or one specific medication. */
type CareItem = { key: string; type: ActionType; medId?: string };

export default function LogsScreen() {
  const { state, hydrated, logAction, addVetVisit, toast } = useStore();
  const refreshControl = usePullToRefresh();
  const router = useRouter();
  const [petId, setPetId] = useState("");
  const [justLogged, setJustLogged] = useState<string | null>(null);
  const [feedPortionOpen, setFeedPortionOpen] = useState(false);
  const [medAddOpen, setMedAddOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTarget, setEditorTarget] = useState<{ type: ActionType; medId?: string }>({ type: "fed" });
  const [retroOpen, setRetroOpen] = useState(false);
  const [retroType, setRetroType] = useState<ActionType | null>(null);
  const [retroMedId, setRetroMedId] = useState<string | null>(null);
  const [retroDay, setRetroDay] = useState<"today" | "yesterday">("today");
  const [retroTime, setRetroTime] = useState("");
  const [vetDetailOpen, setVetDetailOpen] = useState(false);
  const [vetReason, setVetReason] = useState("");
  const [vetClinic, setVetClinic] = useState("");
  const vetClinicRef = useRef<TextInput>(null);
  const prevDayDoneRef = useRef<{ petId: string; done: boolean } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(flashTimer.current), []);

  // The schedule states flip on pure time passing (grace windows, due slots) —
  // tick once a minute so the dashboard stays honest while the tab is open.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const activePetId = petId || state.pets[0]?.id || "";
  const pet = state.pets.find((p) => p.id === activePetId) ?? state.pets[0];

  const todays = useMemo(() => {
    if (!pet) return [];
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    return state.activities.filter((a) => a.petId === pet.id && a.ts >= startOfDay.getTime());
  }, [state.activities, pet, now]);

  // Every dashboard item for this pet: species actions, then one row per med,
  // then vet. Statuses come from the shared schedule state machine.
  const items: (CareItem & { status: CareItemStatus })[] = useMemo(() => {
    if (!pet) return [];
    const base = pet.species === "cat" ? CAT_ACTIONS : DOG_ACTIONS;
    const list: CareItem[] = [
      ...base.map((type) => ({ key: type, type })),
      ...pet.meds.map((m) => ({ key: `med:${m.id}`, type: "meds" as ActionType, medId: m.id })),
      { key: "vet", type: "vet" as ActionType },
    ];
    return list.map((item) => ({
      ...item,
      status: careItemStatus(pet, item.type, item.medId, state.schedules, state.activities, now),
    }));
  }, [pet, state.schedules, state.activities, now]);

  // "All caught up today" — fires once when every scheduled/targeted item for
  // the selected pet flips to done (or has met its daily count).
  useEffect(() => {
    if (!pet) return;
    const tracked = items.filter((i) => i.type !== "vet");
    const dayDone =
      tracked.length > 0 &&
      tracked.every((i) =>
        i.status.state === "unscheduled"
          ? i.status.progress == null || i.status.progress.count >= i.status.progress.target
          : i.status.state === "done" || i.status.state === "upcoming"
      );
    const prev = prevDayDoneRef.current;
    if (prev && prev.petId === pet.id && !prev.done && dayDone) {
      toast("star", "All caught up today!", `${pet.name}'s care is all done for today`);
    }
    prevDayDoneRef.current = { petId: pet.id, done: dayDone };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, pet?.id]);

  if (!hydrated)
    return (
      <TabScreen title="Logs" subtitle="Who did what, and what's next" trailing={<HeaderActions />} refreshControl={refreshControl}>
        <PageLoading />
      </TabScreen>
    );
  if (!pet) {
    return (
      <TabScreen title="Logs" subtitle="Who did what, and what's next" trailing={<HeaderActions />} refreshControl={refreshControl}>
        <View style={{ marginTop: 16 }}>
          <EmptyState
            icon="list"
            title="No pets yet"
            body="Add your first pet to start logging care."
            cta="Add a pet"
            onCta={() => router.push("/pets")}
          />
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

  const quickLog = (item: CareItem & { status: CareItemStatus }) => {
    if (item.type === "fed") {
      setFeedPortionOpen(true);
      return;
    }
    if (logAction(pet.id, item.type, undefined, undefined, item.medId)) {
      flash(item.key);
      // A vet tap naturally produces a health-history record — offer the
      // details right away, skippable.
      if (item.type === "vet") {
        setVetReason("");
        setVetClinic("");
        setVetDetailOpen(true);
      }
    }
  };

  // Parsed "HH:MM" from the retro sheet — null while incomplete/invalid.
  const parsedRetroTime = (() => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(retroTime.trim());
    if (!m) return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (hh > 23 || mm > 59) return null;
    return { hh, mm };
  })();
  // Timestamp for the retro-log sheet — null while incomplete or in the future.
  const retroTimestamp = (() => {
    if (!parsedRetroTime) return null;
    const d = new Date();
    if (retroDay === "yesterday") d.setDate(d.getDate() - 1);
    d.setHours(parsedRetroTime.hh, parsedRetroTime.mm, 0, 0);
    const ts = d.getTime();
    return ts > Date.now() ? null : ts;
  })();
  const retroTimeIsFuture = parsedRetroTime != null && retroTimestamp == null;
  const retroNeedsMed = retroType === "meds" && pet.meds.length > 1 && retroMedId == null;

  // Every outstanding alert type for this pet — drives the red "!" badge on
  // the matching status row.
  const careWarnings = new Set(
    state.reminders
      .filter((r) => r.alert && !r.done && r.petId === pet.id)
      .flatMap((r): ActionType[] => {
        if (!r.vetId) {
          const t = CARE_WARNING_EMOJI[r.emoji];
          return t ? [t] : [];
        }
        const t = ALERT_VERB_TYPES.find((t) => r.title.includes(ALERT_VERB[t]!));
        return t ? [t, "vet"] : ["vet"];
      })
  );

  const upcomingFeedGrams = items.find((i) => i.type === "fed")?.status.next?.grams;
  const retroActions = pet.species === "cat" ? [...CAT_ACTIONS, "meds" as ActionType, "vet" as ActionType] : [...DOG_ACTIONS, "meds" as ActionType, "vet" as ActionType];

  return (
    <TabScreen
      title="Logs"
      subtitle="Who did what, and what's next"
      trailing={<HeaderActions />}
      refreshControl={refreshControl}
    >
      <PetSelectorRow pets={state.pets} selectedId={pet.id} onSelect={setPetId} />

      {/* The dashboard — every care item's state, one-tap logging on the right,
          tap a row to set its schedule. */}
      <SectionHeader>Right now</SectionHeader>
      <Group>
        {items.map((item, i) => (
          <FadeInItem key={item.key} index={i}>
            <CareStatusRow
              pet={pet}
              status={item.status}
              members={state.members}
              warning={careWarnings.has(item.type)}
              justLogged={justLogged === item.key}
              now={now}
              onLog={() => quickLog(item)}
              onPress={() => {
                setEditorTarget({ type: item.type, medId: item.medId });
                setEditorOpen(true);
              }}
            />
          </FadeInItem>
        ))}
        <Row
          onPress={() => setMedAddOpen(true)}
          leading={<IconCircle icon="plus" tint={colors.accent} bg={colors.accentSoft} />}
          title={<Text style={styles.addMedTitle}>Add medication</Text>}
        />
      </Group>
      <Text style={styles.scheduleHint}>Tap any row to set its times — everyone gets reminded, and a ✓ shows until the next one.</Text>

      <PressableScale
        onPress={() => {
          setRetroType(null);
          setRetroMedId(null);
          setRetroDay("today");
          setRetroTime("");
          setRetroOpen(true);
        }}
        accessibilityRole="button"
        style={{ marginTop: 4, alignSelf: "flex-start" }}
      >
        <View style={styles.retroLink}>
          <Icon name="clock" size={13} color={colors.accent} />
          <Text style={styles.retroLinkLabel}>Forgot to log something earlier?</Text>
        </View>
      </PressableScale>

      {/* Today's timeline — who did what, newest first. */}
      <SectionHeader>Today</SectionHeader>
      {todays.length > 0 ? (
        <Group>
          {todays.map((a) => {
            const member = state.members.find((m) => m.id === a.memberId);
            const medName = a.medId ? pet.meds.find((m) => m.id === a.medId)?.name : undefined;
            const gramsNote = a.grams != null ? `${Math.round(a.grams)} g` : undefined;
            return (
              <Row
                key={a.id}
                leading={
                  member ? (
                    <InitialAvatar name={member.name} gradient={member.gradient} size={36} />
                  ) : (
                    <IconCircle icon={ACTION_ICON[a.type].icon} tint={ACTION_ICON[a.type].tint} bg={ACTION_ICON[a.type].bg} />
                  )
                }
                title={`${member?.name ?? "Someone"} ${ACTIONS[a.type].verb} ${pet.name}`}
                subtitle={[medName, gramsNote].filter(Boolean).join(" · ") || undefined}
                trailing={
                  <Text style={styles.timelineTime}>
                    {new Date(a.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </Text>
                }
              />
            );
          })}
        </Group>
      ) : (
        <View style={styles.emptyToday}>
          <Text style={styles.emptyTodayText}>Nothing logged yet today — tap Log on any row above.</Text>
        </View>
      )}

      <Text style={styles.footnote}>
        Every action is shared with the family and shows up in Activity. Tap the bell any time to see what everyone&apos;s been up to.
      </Text>

      {/* Retro logging — backfill something from earlier today or yesterday. */}
      <Sheet open={retroOpen} onClose={() => setRetroOpen(false)}>
        <SheetTitle>Log an earlier action</SheetTitle>
        <SheetSubtitle>For {pet.name} — backfill something you forgot</SheetSubtitle>

        <FieldLabel>What happened</FieldLabel>
        <View style={styles.chipsWrap}>
          {retroActions
            .filter((t) => !(t === "meds" && pet.meds.length === 0))
            .map((type) => {
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

        {retroType === "meds" && pet.meds.length > 1 ? (
          <>
            <FieldLabel>Which med?</FieldLabel>
            <View style={styles.chipsWrap}>
              {pet.meds.map((m) => (
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
        <TextField
          value={retroTime}
          onChangeText={setRetroTime}
          placeholder="HH:MM — e.g. 14:30"
          keyboardType="numbers-and-punctuation"
          returnKeyType="done"
          style={{ marginTop: 10 }}
        />
        {retroTimeIsFuture ? <Text style={styles.retroHint}>That time hasn&apos;t happened yet — pick a time in the past.</Text> : null}

        <SheetFooter>
          <AccentButton
            disabled={!retroType || retroTimestamp == null || retroNeedsMed}
            onPress={() => {
              const ts = retroTimestamp;
              if (!retroType || ts == null || retroNeedsMed) return;
              const medId = retroType === "meds" ? (retroMedId ?? pet.meds[0]?.id) : undefined;
              if (logAction(pet.id, retroType, undefined, ts, medId)) {
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
      <Sheet open={vetDetailOpen} onClose={() => setVetDetailOpen(false)}>
        <SheetTitle>Add visit details?</SheetTitle>
        <SheetSubtitle>Saved to {pet.name}&apos;s health history — skip if it was nothing</SheetSubtitle>

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
        <TextField
          ref={vetClinicRef}
          value={vetClinic}
          onChangeText={setVetClinic}
          placeholder="e.g. Dr. Weber, Happy Paws Clinic"
          returnKeyType="done"
        />

        <SheetFooter>
          <View style={{ gap: 10 }}>
            <AccentButton
              disabled={!vetReason.trim() && !vetClinic.trim()}
              onPress={() => {
                addVetVisit(pet.id, { ts: Date.now(), reason: vetReason.trim() || undefined, vetName: vetClinic.trim() || undefined });
                successHaptic();
                setVetDetailOpen(false);
                toast("stethoscope", "Visit saved", `${pet.name}'s health history updated`);
              }}
            >
              Save details
            </AccentButton>
            <AccentButton variant="gray" onPress={() => setVetDetailOpen(false)}>
              Skip
            </AccentButton>
          </View>
        </SheetFooter>
      </Sheet>

      <FeedPortionSheet
        pet={pet}
        open={feedPortionOpen}
        onClose={() => setFeedPortionOpen(false)}
        presetGrams={upcomingFeedGrams}
        onLogged={() => {
          successHaptic();
          flash("fed");
        }}
      />

      <MedPickerSheet
        pet={pet}
        open={medAddOpen}
        onClose={() => setMedAddOpen(false)}
        initialAdding
        onSelect={(medId) => {
          setMedAddOpen(false);
          if (logAction(pet.id, "meds", undefined, undefined, medId)) flash(`med:${medId}`);
        }}
      />

      <ScheduleEditorSheet
        pet={pet}
        type={editorTarget.type}
        medId={editorTarget.medId}
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
      />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  retroHint: { marginTop: 8, fontSize: 13, fontFamily: font.regular, color: colors.red },
  addMedTitle: { fontSize: 16, fontFamily: font.semibold, color: colors.accent },
  scheduleHint: { marginTop: 8, paddingHorizontal: 4, fontSize: 12, fontFamily: font.regular, color: colors.label3, lineHeight: 17 },
  retroLink: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4, minHeight: 44 },
  retroLinkLabel: { fontSize: 13, fontFamily: font.semibold, color: colors.accent },
  timelineTime: { fontSize: 13, fontFamily: font.regular, color: colors.label3 },
  emptyToday: { paddingHorizontal: 4, paddingVertical: 10 },
  emptyTodayText: { fontSize: 13, fontFamily: font.regular, color: colors.label2 },
  footnote: { marginTop: 16, paddingHorizontal: 4, fontSize: 13, fontFamily: font.regular, color: colors.label2, lineHeight: 20 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
