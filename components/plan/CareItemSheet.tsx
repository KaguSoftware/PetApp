import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Sheet from "@/components/Sheet";
import { SingleWheelPicker } from "@/components/WheelPicker";
import { Icon } from "@/components/Icons";
import { AccentButton, FieldLabel, PressableScale, SheetFooter, SheetSubtitle, SheetTitle, TextField } from "@/components/ui";
import type { PlanEntry, PlanLine } from "@/lib/carePlan";
import { describeSchedule, findSchedule, formatSlotTime } from "@/lib/careStatus";
import type { Pet } from "@/lib/data";
import { GUIDES } from "@/lib/guides";
import { useStore } from "@/lib/store";
import { font, useColors, withAlpha, type Colors } from "@/lib/theme";

/** Grams wheel: 20 g to 1.2 kg in 10 g steps — finer than anyone measures. */
const GRAM_STEP = 10;

function gramOptions(max: number): string[] {
  const out: string[] = [];
  for (let g = GRAM_STEP * 2; g <= max; g += GRAM_STEP) out.push(String(g));
  return out;
}

function countOptions(max: number): string[] {
  return Array.from({ length: max }, (_, i) => String(i + 1));
}

/** Snap to the nearest row the wheel actually offers. */
function nearest(options: string[], value: number | undefined): string {
  if (value == null) return options[0];
  let best = options[0];
  let gap = Infinity;
  for (const o of options) {
    const d = Math.abs(Number(o) - value);
    if (d < gap) {
      gap = d;
      best = o;
    }
  }
  return best;
}

/**
 * What sits behind a value on the Care page.
 *
 * The chip is the control; this is where that item's knowledge lives — the
 * vet's sentence about it, the number itself, what the plan suggested before
 * the family changed it, and the guide that explains how to do it.
 *
 * It also sets the times, which it originally didn't: the split where Care owned
 * "what the routine is" and Logs owned "when we get told" read as a missing
 * feature, because the page opens with a picture of the day and nothing on it
 * could fill that picture in. The times themselves still live in one place —
 * the same `care_schedules` row the Logs tab edits — so the two surfaces can't
 * disagree.
 */
export default function CareItemSheet({
  open,
  onClose,
  line,
  entry,
  tint,
  onSetTimes,
}: {
  open: boolean;
  onClose: () => void;
  line: PlanLine;
  entry: PlanEntry;
  tint: string;
  /** Hand the schedule editor back to the page — one modal at a time. */
  onSetTimes: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { state, editPet, toast } = useStore();
  const pet = entry.pet;

  // Not everything can be put on a clock: nail trimming has a cadence but no
  // hour, so only the lines backed by a schedulable action offer times.
  const medId = entry.edit.kind === "med" ? entry.edit.medId : undefined;
  const schedule = line.action ? findSchedule(state.schedules, pet.id, line.action, medId) : undefined;
  const times = schedule?.slots.length
    ? schedule.intervalDays != null && schedule.intervalDays > 1
      ? describeSchedule(schedule)
      : schedule.slots.map((slot) => formatSlotTime(slot.time)).join(" · ")
    : undefined;

  const wheelOptions =
    entry.edit.kind === "grams" ? gramOptions(1200) : entry.edit.kind === "count" ? countOptions(entry.edit.max) : null;

  const [choice, setChoice] = useState(() => (wheelOptions ? nearest(wheelOptions, entry.amount) : ""));
  const [cadence, setCadence] = useState(entry.rawCadence ?? "");

  // Re-seed whenever the sheet opens on a different chip — adjusting state
  // during render rather than in an effect saves the extra pass.
  const [synced, setSynced] = useState({ open, key: `${line.id}:${pet.id}` });
  const key = `${line.id}:${pet.id}`;
  if (open && (synced.open !== open || synced.key !== key)) {
    setSynced({ open, key });
    if (wheelOptions) setChoice(nearest(wheelOptions, entry.amount));
    setCadence(entry.rawCadence ?? "");
  } else if (!open && synced.open !== open) {
    setSynced({ open, key });
  }

  // Dismiss first, hand off only once the sheet's own Modal has actually gone.
  // A timed guess raced the 240ms exit and the next Modal was silently dropped.
  const pending = useRef<(() => void) | null>(null);
  const leaveTo = (go: () => void) => {
    pending.current = go;
    onClose();
  };
  const flush = () => {
    const go = pending.current;
    pending.current = null;
    go?.();
  };

  const guide = line.guideId ? GUIDES.find((g) => g.id === line.guideId) : undefined;

  /** Every save resends identity — `customPlan` hangs off the pet row. */
  const write = (customPlan: Pet["customPlan"]) =>
    editPet(pet.id, {
      name: pet.name,
      breed: pet.breed,
      ageYears: pet.ageYears,
      weightKg: pet.weightKg,
      cupGrams: pet.cupGrams,
      customPlan,
    });

  const save = () => {
    const edit = entry.edit;
    if (edit.kind === "count") {
      write({ ...pet.customPlan, [edit.key]: Number(choice) });
      toast("list", `${line.label} updated`, `${pet.name} · ${choice}× a day`);
    } else if (edit.kind === "grams") {
      write({ ...pet.customPlan, fedGrams: Number(choice) });
      toast("list", "Food updated", `${pet.name} · ${choice} g a day`);
    } else if (edit.kind === "cadence") {
      const text = cadence.trim();
      if (!text) return;
      write({ ...pet.customPlan, cadences: { ...pet.customPlan?.cadences, [edit.id]: text } });
      toast("list", `${line.label} updated`, `${pet.name} · ${text}`);
    }
    onClose();
  };

  /** Drop the override rather than storing an empty one, so the value falls
   *  back through exactly the path it would have taken if never touched. */
  const reset = () => {
    const edit = entry.edit;
    const next = { ...pet.customPlan };
    if (edit.kind === "count") delete next[edit.key];
    else if (edit.kind === "grams") delete next.fedGrams;
    else if (edit.kind === "cadence") {
      const cadences = { ...next.cadences };
      delete cadences[edit.id];
      next.cadences = cadences;
    }
    write(next);
    toast("list", `${line.label} back to the plan`, `${pet.name} · ${entry.suggested}`);
    onClose();
  };

  const isMed = entry.edit.kind === "med";
  const canSave = entry.edit.kind === "cadence" ? cadence.trim().length > 0 : wheelOptions != null;

  return (
    <Sheet open={open} onClose={onClose} onClosed={flush} scrollable={wheelOptions == null}>
      <SheetTitle>{line.label}</SheetTitle>
      <SheetSubtitle>
        {pet.name} · {pet.breed}
      </SheetSubtitle>

      {entry.detail ? <Text style={styles.detail}>{entry.detail}</Text> : null}
      {entry.extra ? (
        <View style={[styles.extra, { borderColor: withAlpha(tint, 0.3) }]}>
          <Text style={[styles.extraText, { color: tint }]}>{entry.extra}</Text>
        </View>
      ) : null}

      {wheelOptions ? (
        <>
          <FieldLabel>{entry.edit.kind === "grams" ? "Grams a day" : `${line.label} a day`}</FieldLabel>
          <SingleWheelPicker values={wheelOptions} value={choice} onChange={setChoice} width={160} />
        </>
      ) : null}

      {entry.edit.kind === "cadence" ? (
        <>
          <FieldLabel>How often</FieldLabel>
          <TextField value={cadence} onChangeText={setCadence} placeholder="e.g. Every 3 weeks" returnKeyType="done" onSubmitEditing={save} />
        </>
      ) : null}

      {line.action ? (
        <PressableScale
          onPress={() => leaveTo(onSetTimes)}
          accessibilityRole="button"
          accessibilityLabel={times ? `Change times, currently ${times}` : "Set times"}
        >
          <View style={styles.timesRow}>
            <Icon name="clock" size={17} color={times ? tint : colors.label3} strokeWidth={1.9} />
            <Text numberOfLines={1} style={[styles.times, !times && { color: colors.label3 }]}>
              {times ?? "No times set"}
            </Text>
            <Text style={[styles.timesAction, { color: tint }]}>{times ? "Change" : "Set"}</Text>
          </View>
        </PressableScale>
      ) : null}

      {entry.suggested ? (
        <PressableScale onPress={reset} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Reset to ${entry.suggested}`}>
          <View style={styles.resetRow}>
            <Text style={styles.resetText}>
              This is your number. The plan suggests <Text style={styles.resetValue}>{entry.suggested}</Text>.
            </Text>
            <Text style={[styles.resetAction, { color: tint }]}>Reset</Text>
          </View>
        </PressableScale>
      ) : null}

      {guide ? (
        <PressableScale
          onPress={() => leaveTo(() => router.push(`/instructions/${guide.id}`))}
          accessibilityRole="button"
          accessibilityLabel={`Read the ${guide.title} guide`}
        >
          <View style={styles.guideRow}>
            <Icon name={guide.icon} size={18} color={guide.tint} strokeWidth={1.9} />
            <Text style={styles.guideLabel}>How to: {guide.title.toLowerCase()}</Text>
            <Text style={styles.guideMinutes}>{guide.minutes} min</Text>
            <Icon name="chevron-right" size={14} color={colors.label3} />
          </View>
        </PressableScale>
      ) : null}

      <SheetFooter>
        {isMed ? (
          <AccentButton onPress={() => leaveTo(() => router.push({ pathname: "/medications", params: { petId: pet.id } }))}>
            Manage medication
          </AccentButton>
        ) : (
          <AccentButton disabled={!canSave} onPress={save}>
            Save
          </AccentButton>
        )}
      </SheetFooter>
    </Sheet>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    detail: { marginTop: 14, paddingHorizontal: 4, fontSize: 14, fontFamily: font.regular, color: colors.label2, lineHeight: 21 },
    extra: {
      alignSelf: "flex-start",
      marginTop: 12,
      marginHorizontal: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
    },
    extraText: { fontSize: 12.5, fontFamily: font.semibold },
    timesRow: {
      marginTop: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      minHeight: 48,
      paddingHorizontal: 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.sep,
    },
    times: { flex: 1, fontSize: 14.5, fontFamily: font.medium, color: colors.label },
    timesAction: { fontSize: 14, fontFamily: font.semibold },
    resetRow: {
      marginTop: 18,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minHeight: 44,
      paddingHorizontal: 4,
    },
    resetText: { flex: 1, fontSize: 13, fontFamily: font.regular, color: colors.label2, lineHeight: 19 },
    resetValue: { fontFamily: font.semibold, color: colors.label },
    resetAction: { fontSize: 14, fontFamily: font.semibold },
    guideRow: {
      marginTop: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      minHeight: 48,
      paddingHorizontal: 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.sep,
    },
    guideLabel: { flex: 1, fontSize: 14.5, fontFamily: font.medium, color: colors.label },
    guideMinutes: { fontSize: 12, fontFamily: font.medium, color: colors.label3 },
  });
