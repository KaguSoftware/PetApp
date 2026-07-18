import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import PageLoading from "@/components/PageLoading";
import Sheet from "@/components/Sheet";
import { PushedScreen } from "@/components/Screen";
import { Icon } from "@/components/Icons";
import { AccentButton, Group, IconCircle, Row, SectionHeader } from "@/components/ui";
import { RepeatKind, Reminder, nextRepeatDue } from "@/lib/data";
import { dueLabel, useStore } from "@/lib/store";
import { cardShadow, colors, font, radius } from "@/lib/theme";

const DAY_MS = 86_400_000;

const REPEAT_LABEL: Record<RepeatKind, string> = {
  daily: "daily",
  weekly: "weekly",
  every_n_days: "every few days",
};

function repeatLabel(kind: RepeatKind, interval?: number) {
  return kind === "every_n_days" ? `every ${Math.max(1, Math.round(interval ?? 1))} days` : REPEAT_LABEL[kind];
}

/** Small press-scale wrapper — mirrors the web's active:scale-90 buttons. */
function PressScale({
  onPress,
  accessibilityLabel,
  style,
  hitSlop = 10,
  children,
}: {
  onPress: () => void;
  accessibilityLabel?: string;
  style?: object;
  hitSlop?: number;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={anim}>
      <Pressable
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        hitSlop={hitSlop}
        onPressIn={() => (scale.value = withTiming(0.9, { duration: 120, easing: Easing.out(Easing.quad) }))}
        onPressOut={() => (scale.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }))}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/** Selectable pill chip — the web's rounded-full accent/card toggle buttons. */
function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.pill, active && styles.pillActive, pressed && { opacity: 0.85 }]}
    >
      <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{label}</Text>
    </Pressable>
  );
}

/** −/+ stepper with a centered value label — the no-dependency date/time picker control. */
function Stepper({
  label,
  onDec,
  onInc,
  decDisabled = false,
  accessibilityLabel,
}: {
  label: string;
  onDec: () => void;
  onInc: () => void;
  decDisabled?: boolean;
  accessibilityLabel: string;
}) {
  return (
    <View style={styles.stepper} accessibilityLabel={accessibilityLabel}>
      <Pressable
        onPress={onDec}
        disabled={decDisabled}
        hitSlop={8}
        accessibilityLabel={`${accessibilityLabel} — decrease`}
        style={({ pressed }) => [styles.stepperButton, decDisabled && { opacity: 0.3 }, pressed && { backgroundColor: colors.fill }]}
      >
        <Text style={styles.stepperSign}>−</Text>
      </Pressable>
      <Text numberOfLines={1} style={styles.stepperValue}>
        {label}
      </Text>
      <Pressable
        onPress={onInc}
        hitSlop={8}
        accessibilityLabel={`${accessibilityLabel} — increase`}
        style={({ pressed }) => [styles.stepperButton, pressed && { backgroundColor: colors.fill }]}
      >
        <Text style={styles.stepperSign}>+</Text>
      </Pressable>
    </View>
  );
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function RemindersScreen() {
  const { state, hydrated, addReminder, toggleReminder, deleteReminder, toast } = useStore();
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [petId, setPetId] = useState("");
  const [days, setDays] = useState(1);
  const [pickDate, setPickDate] = useState(false);
  // No-dependency replacement for the web's <input type="date/time">: a day
  // offset stepper (Today / Tomorrow / actual date) + a 15-min-step time.
  const [pickDay, setPickDay] = useState(0);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [repeat, setRepeat] = useState<"none" | RepeatKind>("none");
  const [intervalDays, setIntervalDays] = useState(3);

  const addButton = (
    <PressScale
      onPress={() => setAddOpen(true)}
      accessibilityLabel="Add reminder"
      hitSlop={8}
      style={styles.addButton}
    >
      <Icon name="plus" size={17} color={colors.white} />
    </PressScale>
  );

  if (!hydrated) {
    return (
      <PushedScreen title="Reminders" trailing={addButton}>
        <PageLoading />
      </PushedScreen>
    );
  }

  // Default to the first pet until the user explicitly picks one — the raw
  // useState initializer ran while the store was still empty, so petId can't
  // seed itself from state.pets.
  const activePetId = petId || state.pets[0]?.id || "";
  const upcoming = state.reminders.filter((r) => !r.done).sort((a, b) => a.due - b.due);
  const done = state.reminders.filter((r) => r.done);
  const petOf = (id: string) => state.pets.find((p) => p.id === id);

  // Agenda grouping — one section per calendar day so the list reads as a
  // schedule, not a flat pile.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const agendaKey = (due: number) => {
    const diff = Math.floor((due - startOfToday.getTime()) / DAY_MS);
    if (diff < 0) return "Overdue";
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    return new Date(due).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  };
  const agenda: { day: string; items: Reminder[] }[] = [];
  for (const r of upcoming) {
    const day = agendaKey(r.due);
    const g = agenda[agenda.length - 1];
    if (g && g.day === day) g.items.push(r);
    else agenda.push({ day, items: [r] });
  }

  const closeSheet = () => {
    setAddOpen(false);
    setTitle("");
    setPickDate(false);
    setPickDay(0);
    setHour(9);
    setMinute(0);
    setRepeat("none");
  };

  const dayOffsetLabel = (n: number) => {
    if (n === 0) return "Today";
    if (n === 1) return "Tomorrow";
    return new Date(startOfToday.getTime() + n * DAY_MS).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  };

  const stepTime = (dir: 1 | -1) => {
    const total = (hour * 60 + minute + dir * 15 + 1440) % 1440;
    setHour(Math.floor(total / 60));
    setMinute(total % 60);
  };

  // One calm row per reminder — alerts get red title text only (the red wall,
  // dedupe, and book-vet actions live on /activity).
  const renderRow = (r: Reminder) => {
    const pet = petOf(r.petId);
    const isAlert = r.alert && !r.done;
    return (
      <Row
        key={r.id}
        leading={
          <PressScale
            onPress={() => {
              toggleReminder(r.id);
              if (r.repeatKind && !r.done)
                toast("repeat", `Done: ${r.title}`, `Next ${dueLabel(nextRepeatDue(r.due, r.repeatKind, r.repeatInterval))}`);
              else if (!r.done) toast("check", `Done: ${r.title}`, "Marked complete for the family");
              else toast("refresh", `Reopened: ${r.title}`, "Marked as not done");
            }}
            accessibilityLabel={r.done ? "Mark as not done" : "Mark as done"}
            hitSlop={12}
            style={[styles.check, r.done && styles.checkDone]}
          >
            {r.done ? <Icon name="check" size={14} color={colors.white} /> : null}
          </PressScale>
        }
        title={
          <Text numberOfLines={1} style={[styles.rowTitle, r.done ? styles.rowTitleDone : null, isAlert ? { color: colors.red } : null]}>
            {r.title}
          </Text>
        }
        subtitle={
          <View style={styles.subtitleRow}>
            <Text numberOfLines={1} style={styles.rowSubtitle}>
              {`${pet ? `${pet.name} · ` : ""}${r.done ? "completed" : dueLabel(r.due)}`}
            </Text>
            {r.repeatKind && !r.done ? (
              <>
                <Icon name="repeat" size={11} color={colors.label3} />
                <Text numberOfLines={1} style={styles.rowSubtitle}>
                  {repeatLabel(r.repeatKind, r.repeatInterval)}
                </Text>
              </>
            ) : null}
          </View>
        }
        trailing={
          <PressScale onPress={() => deleteReminder(r.id)} accessibilityLabel={`Delete ${r.title}`} hitSlop={10} style={styles.delete}>
            <Icon name="xmark" size={15} color={colors.label3} />
          </PressScale>
        }
      />
    );
  };

  return (
    <PushedScreen title="Reminders" trailing={addButton}>
      {upcoming.length > 0 ? (
        agenda.map((g) => (
          <View key={g.day}>
            <SectionHeader>{g.day}</SectionHeader>
            <Group>{g.items.map(renderRow)}</Group>
          </View>
        ))
      ) : (
        <>
          <SectionHeader>Upcoming</SectionHeader>
          <Group>
            <View style={styles.emptyWrap}>
              <IconCircle icon="check" tint={colors.green} bg={colors.greenSoft} size={48} iconSize={22} />
              <Text style={styles.emptyTitle}>All clear</Text>
              <Text style={styles.emptyBody}>Add a reminder and the whole family sees it.</Text>
            </View>
          </Group>
        </>
      )}

      {done.length > 0 ? (
        <>
          <SectionHeader>Completed</SectionHeader>
          <Group>{done.map(renderRow)}</Group>
        </>
      ) : null}

      <Sheet open={addOpen} onClose={closeSheet}>
        <Text style={styles.sheetTitle}>New reminder</Text>

        <Text style={styles.fieldLabel}>TASK</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Buy litter, flea treatment…"
          placeholderTextColor={colors.label3}
          style={styles.input}
        />

        <Text style={styles.fieldLabel}>PET</Text>
        <View style={styles.chipRow}>
          {state.pets.map((p) => (
            <Pill key={p.id} label={p.name} active={activePetId === p.id} onPress={() => setPetId(p.id)} />
          ))}
        </View>

        <Text style={styles.fieldLabel}>DUE</Text>
        <View style={styles.chipRow}>
          {[
            { d: 0, label: "Today" },
            { d: 1, label: "Tomorrow" },
            { d: 3, label: "In 3 days" },
            { d: 7, label: "Next week" },
          ].map((o) => (
            <Pill
              key={o.d}
              label={o.label}
              active={!pickDate && days === o.d}
              onPress={() => {
                setDays(o.d);
                setPickDate(false);
              }}
            />
          ))}
          <Pill label="Pick date…" active={pickDate} onPress={() => setPickDate(true)} />
        </View>
        {pickDate ? (
          <View style={styles.pickerRow}>
            <Stepper
              label={dayOffsetLabel(pickDay)}
              onDec={() => setPickDay((d) => Math.max(0, d - 1))}
              onInc={() => setPickDay((d) => d + 1)}
              decDisabled={pickDay === 0}
              accessibilityLabel="Due date"
            />
            <Stepper
              label={`${pad(hour)}:${pad(minute)}`}
              onDec={() => stepTime(-1)}
              onInc={() => stepTime(1)}
              accessibilityLabel="Time of day"
            />
          </View>
        ) : null}

        <Text style={styles.fieldLabel}>REPEAT</Text>
        <View style={styles.chipRow}>
          {(
            [
              { value: "none", label: "Once" },
              { value: "daily", label: "Daily" },
              { value: "weekly", label: "Weekly" },
              { value: "every_n_days", label: "Every… days" },
            ] as { value: "none" | RepeatKind; label: string }[]
          ).map((o) => (
            <Pill key={o.value} label={o.label} active={repeat === o.value} onPress={() => setRepeat(o.value)} />
          ))}
          {repeat === "every_n_days" ? (
            <Stepper
              label={`${intervalDays}`}
              onDec={() => setIntervalDays((n) => Math.max(1, n - 1))}
              onInc={() => setIntervalDays((n) => n + 1)}
              decDisabled={intervalDays <= 1}
              accessibilityLabel="Days between repeats"
            />
          ) : null}
        </View>

        <View style={{ marginTop: 28 }}>
          <AccentButton
            disabled={!title.trim() || !activePetId || (repeat === "every_n_days" && intervalDays < 1)}
            onPress={() => {
              const due = pickDate
                ? startOfToday.getTime() + pickDay * DAY_MS + (hour * 60 + minute) * 60_000
                : Date.now() + days * DAY_MS;
              addReminder({
                petId: activePetId,
                title: title.trim(),
                emoji: "📝",
                due,
                repeatKind: repeat === "none" ? undefined : repeat,
                repeatInterval: repeat === "every_n_days" ? Math.round(intervalDays) : undefined,
              });
              closeSheet();
              toast(
                repeat === "none" ? "clock" : "repeat",
                "Reminder added",
                repeat === "none" ? "Visible to the whole family" : `Repeats ${repeatLabel(repeat, intervalDays)}`
              );
            }}
          >
            Add reminder
          </AccentButton>
        </View>
      </Sheet>
    </PushedScreen>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "rgba(28, 28, 35, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkDone: { borderColor: colors.accent, backgroundColor: colors.accent },
  rowTitle: { fontSize: 16, fontFamily: font.medium, color: colors.label },
  rowTitleDone: { color: colors.label3, textDecorationLine: "line-through" },
  subtitleRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
  rowSubtitle: { fontSize: 13, fontFamily: font.regular, color: colors.label2, flexShrink: 1 },
  delete: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  emptyWrap: { alignItems: "center", paddingHorizontal: 24, paddingVertical: 36 },
  emptyTitle: { marginTop: 12, fontSize: 15, fontFamily: font.semibold, color: colors.label },
  emptyBody: { marginTop: 2, fontSize: 13, fontFamily: font.regular, color: colors.label2, textAlign: "center" },
  sheetTitle: { fontSize: 20, fontFamily: font.bold, letterSpacing: -0.2, color: colors.label },
  fieldLabel: { marginTop: 20, marginBottom: 6, fontSize: 13, fontFamily: font.semibold, letterSpacing: 0.8, color: colors.label2 },
  input: {
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: font.medium,
    color: colors.label,
    minHeight: 48,
    ...cardShadow,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  pill: {
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 9,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    ...cardShadow,
  },
  pillActive: { backgroundColor: colors.accent },
  pillLabel: { fontSize: 14, fontFamily: font.semibold, color: colors.label },
  pillLabelActive: { color: colors.white },
  pickerRow: { marginTop: 10, flexDirection: "row", gap: 8 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    paddingHorizontal: 4,
    minHeight: 44,
    flexShrink: 1,
    ...cardShadow,
  },
  stepperButton: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  stepperSign: { fontSize: 20, fontFamily: font.semibold, color: colors.accent, lineHeight: 22 },
  stepperValue: {
    minWidth: 56,
    paddingHorizontal: 4,
    textAlign: "center",
    fontSize: 15,
    fontFamily: font.medium,
    color: colors.label,
    flexShrink: 1,
  },
});
