import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateField from "@/components/DateField";
import FilterSheet from "@/components/FilterSheet";
import PageLoading from "@/components/PageLoading";
import Sheet from "@/components/Sheet";
import { Stepper } from "@/components/TimeStepper";
import { TimeWheelPicker } from "@/components/WheelPicker";
import { PushedScreen } from "@/components/Screen";
import { usePullToRefresh } from "@/lib/useRefresh";
import { Icon } from "@/components/Icons";
import {
  AccentButton,
  Chip,
  FieldLabel,
  Group,
  IconCircle,
  PressableScale,
  PRESS_SCALE_SMALL,
  Row,
  SectionHeader,
  SelectableChip,
  SheetFooter,
  SheetSubtitle,
  SheetTitle,
  TextField,
} from "@/components/ui";
import { RepeatKind, Reminder, REMINDER_TAGS, nextRepeatDue } from "@/lib/data";
import { dueLabel, useStore } from "@/lib/store";
import { useListFilter } from "@/lib/useListFilter";
import { font, withAlpha, useColors, type Colors } from "@/lib/theme";

const DAY_MS = 86_400_000;
const isIOS = Platform.OS === "ios";

const REPEAT_LABEL: Record<RepeatKind, string> = {
  daily: "daily",
  weekly: "weekly",
  every_n_days: "every few days",
};

function repeatLabel(kind: RepeatKind, interval?: number) {
  return kind === "every_n_days" ? `every ${Math.max(1, Math.round(interval ?? 1))} days` : REPEAT_LABEL[kind];
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function RemindersScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { state, hydrated, addReminder, toggleReminder, deleteReminder, toast } = useStore();
  const [addOpen, setAddOpen] = useState(false);
  const refreshControl = usePullToRefresh();
  const [title, setTitle] = useState("");
  const [petId, setPetId] = useState("");
  const [days, setDays] = useState(1);
  const [pickDate, setPickDate] = useState(false);
  // The exact-date branch: the shared <DateField> calendar for the day, plus
  // the 15-min-step time wheel below it. `pickTs` is a noon timestamp; the
  // time is applied on save.
  const [pickTs, setPickTs] = useState<number | null>(null);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [repeat, setRepeat] = useState<"none" | RepeatKind>("none");
  const [intervalDays, setIntervalDays] = useState(3);
  const [tag, setTag] = useState<string | undefined>(undefined);
  const [customTagOpen, setCustomTagOpen] = useState(false);
  const [customTag, setCustomTag] = useState("");
  // Long titles/subtitles are clipped to one line by default; tapping a row
  // toggles it to show the full text instead of navigating anywhere.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const filter = useListFilter();
  const [filterOpen, setFilterOpen] = useState(false);

  // Plain Pressable with an opacity dim, NOT PressableScale: this renders
  // inside the native header's UIBarButtonItem, where a spring-scale transform
  // clips against the bar item's bounds mid-animation (the iOS "add button
  // visual bug"). Same pattern as NotificationBell/SettingsButton, which
  // render clean. 38pt box + hitSlop 6 → 50pt effective target.
  const addButton = (
    <Pressable
      onPress={() => setAddOpen(true)}
      accessibilityRole="button"
      accessibilityLabel="Add reminder"
      hitSlop={6}
      style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.6 }]}
    >
      {/* iPhone gets a chromeless glyph (no filled pill); Android keeps the
          accent circle so the control stays visible against the header. */}
      <Icon
        name="plus"
        size={isIOS ? 25 : 17}
        color={isIOS ? colors.accent : colors.white}
      />
    </Pressable>
  );

  const filterButton = (
    <Pressable
      onPress={() => setFilterOpen(true)}
      accessibilityRole="button"
      accessibilityLabel="Filter reminders"
      hitSlop={6}
      style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.6 }]}
    >
      <Icon name="filter" size={isIOS ? 22 : 17} color={isIOS ? colors.accent : colors.white} />
      {filter.activeCount > 0 ? <View style={styles.filterDot} /> : null}
    </Pressable>
  );
  const headerTrailing = (
    <>
      {filterButton}
      {addButton}
    </>
  );

  if (!hydrated) {
    return (
      <PushedScreen title="Reminders" trailing={headerTrailing} refreshControl={refreshControl}>
        <PageLoading />
      </PushedScreen>
    );
  }

  // Default to the first pet until the user explicitly picks one — the raw
  // useState initializer ran while the store was still empty, so petId can't
  // seed itself from state.pets. Validated against the live roster: pets are
  // realtime-synced, so a selection can be deleted out from under this sheet
  // mid-session — and with a single pet the chip row isn't even rendered to
  // correct it by hand.
  const activePetId = (petId && state.pets.some((p) => p.id === petId) ? petId : state.pets[0]?.id) || "";
  const petOf = (id: string) => state.pets.find((p) => p.id === id);
  const matchesFilter = (r: Reminder) =>
    (filter.petId == null || r.petId === filter.petId) && (filter.tags.size === 0 || (r.tag != null && filter.tags.has(r.tag)));
  const upcoming = state.reminders.filter((r) => !r.done && matchesFilter(r)).sort((a, b) => a.due - b.due);
  const done = state.reminders.filter((r) => r.done && matchesFilter(r));
  const extraTags = Array.from(new Set(state.reminders.map((r) => r.tag).filter((t): t is string => !!t)));

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
    setPickTs(null);
    setHour(9);
    setMinute(0);
    setRepeat("none");
    setTag(undefined);
    setCustomTagOpen(false);
    setCustomTag("");
  };

  // One calm row per reminder — alerts get red title text only (the red wall,
  // dedupe, and book-vet actions live on /activity).
  const renderRow = (r: Reminder) => {
    const pet = petOf(r.petId);
    const isAlert = r.alert && !r.done;
    const expanded = expandedId === r.id;
    return (
      <Row
        key={r.id}
        onPress={() => setExpandedId(expanded ? null : r.id)}
        interactiveTrailing
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
          <Text
            numberOfLines={expanded ? undefined : 1}
            style={[styles.rowTitle, r.done ? styles.rowTitleDone : null, isAlert ? { color: colors.red } : null]}
          >
            {r.title}
          </Text>
        }
        subtitle={
          <View style={styles.subtitleRow}>
            <Text numberOfLines={expanded ? undefined : 1} style={styles.rowSubtitle}>
              {`${pet ? `${pet.name} · ` : ""}${r.done ? "completed" : dueLabel(r.due)}`}
            </Text>
            {r.repeatKind && !r.done ? (
              <>
                <Icon name="repeat" size={11} color={colors.label3} />
                <Text numberOfLines={expanded ? undefined : 1} style={styles.rowSubtitle}>
                  {repeatLabel(r.repeatKind, r.repeatInterval)}
                </Text>
              </>
            ) : null}
            {r.tag ? <Chip style={styles.tagChip}>{r.tag}</Chip> : null}
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

  // Same pair of controls as the loading state above — this branch used to drop
  // the filter button once the data arrived, which left FilterSheet (below)
  // mounted with nothing left on screen able to open it.
  return (
    <PushedScreen title="Reminders" trailing={headerTrailing} refreshControl={refreshControl}>
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
        <SheetSubtitle>Visible to the whole family</SheetSubtitle>

        <FieldLabel>Task</FieldLabel>
        <TextField value={title} onChangeText={setTitle} placeholder="e.g. Buy litter, flea treatment…" />

        {/* One pet = one pre-selected chip that can't be deselected — skip the
            whole row; activePetId already falls back to the only pet. */}
        {state.pets.length > 1 ? (
          <>
            <FieldLabel>Pet</FieldLabel>
            <View style={styles.chipRow}>
              {state.pets.map((p) => (
                <SelectableChip key={p.id} label={p.name} selected={activePetId === p.id} onPress={() => setPetId(p.id)} />
              ))}
            </View>
          </>
        ) : null}

        <FieldLabel>Tag</FieldLabel>
        <View style={styles.chipRow}>
          {REMINDER_TAGS.map((t) => (
            <SelectableChip
              key={t}
              label={t}
              selected={tag === t}
              onPress={() => {
                setTag(tag === t ? undefined : t);
                setCustomTagOpen(false);
              }}
            />
          ))}
          <SelectableChip
            label="+"
            selected={customTagOpen}
            onPress={() => {
              setCustomTagOpen((v) => !v);
              setTag(undefined);
            }}
          />
        </View>
        {customTagOpen ? (
          <View style={styles.pickerRow}>
            <View style={{ flex: 1 }}>
              <TextField
                value={customTag}
                onChangeText={(t) => {
                  setCustomTag(t);
                  setTag(t.trim() || undefined);
                }}
                placeholder="Custom tag"
                returnKeyType="done"
              />
            </View>
          </View>
        ) : null}

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
          <SelectableChip
            label="Pick date…"
            selected={pickDate}
            onPress={() => {
              setPickDate(true);
              if (pickTs == null) {
                const noon = new Date();
                noon.setHours(12, 0, 0, 0);
                setPickTs(noon.getTime());
              }
            }}
          />
        </View>
        {pickDate ? (
          <View style={styles.pickerRow}>
            {/* showChips off: the calendar's quick-jump chips would duplicate
                the Due presets right above it. */}
            <DateField value={pickTs} onChange={setPickTs} mode="future" showChips={false} />
          </View>
        ) : null}
        {pickDate ? (
          <View style={styles.pickerBlock}>
            <TimeWheelPicker
              value={`${pad(hour)}:${pad(minute)}`}
              onChange={(t) => {
                const [h, m] = t.split(":");
                setHour(Number(h));
                setMinute(Number(m));
              }}
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
        </View>
        {repeat === "every_n_days" ? (
          <View style={styles.pickerRow}>
            <Stepper
              label={`Every ${intervalDays} days`}
              onDec={() => setIntervalDays((n) => Math.max(1, n - 1))}
              onInc={() => setIntervalDays((n) => n + 1)}
              decDisabled={intervalDays <= 1}
              accessibilityLabel="Days between repeats"
            />
          </View>
        ) : null}

        <SheetFooter>
          <AccentButton
            disabled={!title.trim() || !activePetId || (pickDate && pickTs == null) || (repeat === "every_n_days" && intervalDays < 1)}
            onPress={() => {
              let due: number;
              if (pickDate && pickTs != null) {
                const d = new Date(pickTs);
                d.setHours(hour, minute, 0, 0);
                due = d.getTime();
              } else {
                due = Date.now() + days * DAY_MS;
              }
              addReminder({
                petId: activePetId,
                title: title.trim(),
                emoji: "📝",
                due,
                repeatKind: repeat === "none" ? undefined : repeat,
                repeatInterval: repeat === "every_n_days" ? Math.round(intervalDays) : undefined,
                tag,
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

      <FilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} filter={filter} pets={state.pets} showTags extraTags={extraTags} />
    </PushedScreen>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  addButton: {
    // iPhone: chromeless 38pt glyph box (matches the bell/gear header metrics
    // — no pill, no shadow, no transform inside the UIBarButtonItem).
    // Android: 36pt accent circle (visual + hitSlop → 44pt+ effective target).
    width: isIOS ? 38 : 36,
    height: isIOS ? 38 : 36,
    alignItems: "center",
    justifyContent: "center",
    ...(isIOS
      ? null
      : {
          borderRadius: 18,
          backgroundColor: colors.accent,
          shadowColor: colors.accent,
          shadowOpacity: 0.35,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4,
        }),
  },
  filterDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.red,
  },
  tagChip: { marginLeft: 2 },
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
  pickerRow: { marginTop: 12, flexDirection: "row", gap: 8 },
  pickerBlock: { marginTop: 12 },
});
