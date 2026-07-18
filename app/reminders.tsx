import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import PageLoading from "@/components/PageLoading";
import Sheet from "@/components/Sheet";
import { PushedScreen } from "@/components/Screen";
import { Icon } from "@/components/Icons";
import {
  AccentButton,
  FieldLabel,
  Group,
  IconCircle,
  PressableScale,
  PRESS_SCALE_SMALL,
  Row,
  SectionHeader,
  SelectableChip,
  SheetFooter,
  SheetTitle,
  TextField,
} from "@/components/ui";
import { RepeatKind, Reminder, nextRepeatDue } from "@/lib/data";
import { dueLabel, useStore } from "@/lib/store";
import { cardShadow, colors, font, radius, withAlpha } from "@/lib/theme";

const DAY_MS = 86_400_000;

const REPEAT_LABEL: Record<RepeatKind, string> = {
  daily: "daily",
  weekly: "weekly",
  every_n_days: "every few days",
};

function repeatLabel(kind: RepeatKind, interval?: number) {
  return kind === "every_n_days" ? `every ${Math.max(1, Math.round(interval ?? 1))} days` : REPEAT_LABEL[kind];
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
      <PressableScale
        scaleTo={PRESS_SCALE_SMALL}
        onPress={onDec}
        disabled={decDisabled}
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel} — decrease`}
        accessibilityState={{ disabled: decDisabled }}
      >
        <View style={[styles.stepperButton, decDisabled && { opacity: 0.3 }]}>
          <Text style={styles.stepperSign}>−</Text>
        </View>
      </PressableScale>
      <Text numberOfLines={1} style={styles.stepperValue}>
        {label}
      </Text>
      <PressableScale
        scaleTo={PRESS_SCALE_SMALL}
        onPress={onInc}
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel} — increase`}
      >
        <View style={styles.stepperButton}>
          <Text style={styles.stepperSign}>+</Text>
        </View>
      </PressableScale>
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
    <PressableScale
      scaleTo={PRESS_SCALE_SMALL}
      onPress={() => setAddOpen(true)}
      accessibilityRole="button"
      accessibilityLabel="Add reminder"
      hitSlop={8}
    >
      <View style={styles.addButton}>
        <Icon name="plus" size={17} color={colors.white} />
      </View>
    </PressableScale>
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
          <PressableScale
            scaleTo={PRESS_SCALE_SMALL}
            onPress={() => {
              toggleReminder(r.id);
              if (r.repeatKind && !r.done)
                toast("repeat", `Done: ${r.title}`, `Next ${dueLabel(nextRepeatDue(r.due, r.repeatKind, r.repeatInterval))}`);
              else if (!r.done) toast("check", `Done: ${r.title}`, "Marked complete for the family");
              else toast("refresh", `Reopened: ${r.title}`, "Marked as not done");
            }}
            accessibilityRole="button"
            accessibilityLabel={r.done ? "Mark as not done" : "Mark as done"}
            accessibilityState={{ checked: r.done }}
          >
            {/* 44pt effective target; the visual circle stays a slim 28pt */}
            <View style={styles.checkZone}>
              <View style={[styles.check, r.done && styles.checkDone]}>
                {r.done ? <Icon name="check" size={14} color={colors.white} /> : null}
              </View>
            </View>
          </PressableScale>
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
          <PressableScale
            scaleTo={PRESS_SCALE_SMALL}
            onPress={() => deleteReminder(r.id)}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${r.title}`}
          >
            <View style={styles.deleteZone}>
              <Icon name="xmark" size={15} color={colors.label3} />
            </View>
          </PressableScale>
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
        <SheetTitle>New reminder</SheetTitle>

        <FieldLabel>Task</FieldLabel>
        <TextField value={title} onChangeText={setTitle} placeholder="e.g. Buy litter, flea treatment…" />

        <FieldLabel>Pet</FieldLabel>
        <View style={styles.chipRow}>
          {state.pets.map((p) => (
            <SelectableChip key={p.id} label={p.name} selected={activePetId === p.id} onPress={() => setPetId(p.id)} />
          ))}
        </View>

        <FieldLabel>Due</FieldLabel>
        <View style={styles.chipRow}>
          {[
            { d: 0, label: "Today" },
            { d: 1, label: "Tomorrow" },
            { d: 3, label: "In 3 days" },
            { d: 7, label: "Next week" },
          ].map((o) => (
            <SelectableChip
              key={o.d}
              label={o.label}
              selected={!pickDate && days === o.d}
              onPress={() => {
                setDays(o.d);
                setPickDate(false);
              }}
            />
          ))}
          <SelectableChip label="Pick date…" selected={pickDate} onPress={() => setPickDate(true)} />
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

        <FieldLabel>Repeat</FieldLabel>
        <View style={styles.chipRow}>
          {(
            [
              { value: "none", label: "Once" },
              { value: "daily", label: "Daily" },
              { value: "weekly", label: "Weekly" },
              { value: "every_n_days", label: "Every… days" },
            ] as { value: "none" | RepeatKind; label: string }[]
          ).map((o) => (
            <SelectableChip key={o.value} label={o.label} selected={repeat === o.value} onPress={() => setRepeat(o.value)} />
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

        <SheetFooter>
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
        </SheetFooter>
      </Sheet>
    </PushedScreen>
  );
}

const styles = StyleSheet.create({
  addButton: {
    // 36pt visual + hitSlop 8 → 44pt effective target in the native header
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  checkZone: {
    width: 44,
    height: 44,
    marginVertical: -8,
    marginLeft: -8,
    alignItems: "center",
    justifyContent: "center",
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: withAlpha(colors.label, 0.25),
    alignItems: "center",
    justifyContent: "center",
  },
  checkDone: { borderColor: colors.accent, backgroundColor: colors.accent },
  rowTitle: { fontSize: 16, fontFamily: font.medium, color: colors.label },
  rowTitleDone: { color: colors.label3, textDecorationLine: "line-through" },
  subtitleRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
  rowSubtitle: { fontSize: 13, fontFamily: font.regular, color: colors.label2, flexShrink: 1 },
  deleteZone: {
    width: 44,
    height: 44,
    marginVertical: -8,
    marginRight: -10,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: { alignItems: "center", paddingHorizontal: 24, paddingVertical: 36 },
  emptyTitle: { marginTop: 12, fontSize: 15, fontFamily: font.semibold, color: colors.label },
  emptyBody: { marginTop: 2, fontSize: 13, fontFamily: font.regular, color: colors.label2, textAlign: "center" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  pickerRow: { marginTop: 10, flexDirection: "row", gap: 8 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    minHeight: 44,
    flexShrink: 1,
    ...cardShadow,
  },
  stepperButton: { width: 44, height: 44, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
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
