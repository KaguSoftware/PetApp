import * as Crypto from "expo-crypto";
import { useEffect, useMemo, useState } from "react";
import { ActionSheetIOS, Platform, StyleSheet, Text, View } from "react-native";
import Sheet from "@/components/Sheet";
import { DrillView } from "@/components/Motion";
import { Icon } from "@/components/Icons";
import { Stepper } from "@/components/TimeStepper";
import { SingleWheelPicker, TimeWheelPicker } from "@/components/WheelPicker";
import {
  AccentButton,
  FieldLabel,
  Footnote,
  PRESS_SCALE_SMALL,
  PressableScale,
  Segmented,
  SelectableChip,
  SheetFooter,
  SheetSubtitle,
  SheetTitle,
  SmallButton,
} from "@/components/ui";
import { careItemLabel, describeCadence, findSchedule, formatSlotTime } from "@/lib/careStatus";
import {
  EVERY_DAY_MASK,
  PORTIONS,
  maskHasDay,
  type ActionType,
  type CareScheduleSlot,
  type Pet,
} from "@/lib/data";
import { useStore } from "@/lib/store";
import { cardShadow, font, radius, useColors, type Colors } from "@/lib/theme";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const MAX_SLOTS = 12;

/**
 * The early-log window, fixed at the default nearly everyone kept when it was
 * a per-schedule stepper: a log up to this many minutes before a slot counts
 * for it, and a ✓ un-checks this many minutes before the next slot. The value
 * still persists per-schedule (grace_minutes) for web-demo parity — this is
 * just no longer a knob.
 */
const GRACE_MINUTES = 30;

/** Wheel entry meaning "this slot has no set amount". */
const NO_AMOUNT = "No set amount";

/** Sensible starting times when creating a schedule with N slots. */
const DEFAULT_TIMES: Record<number, string[]> = {
  1: ["08:00"],
  2: ["08:00", "18:00"],
  3: ["08:00", "13:00", "19:00"],
};

/**
 * Long-cadence presets, in days. Vet visits and grooming are thought about in
 * months ("every 6 months", "yearly"), never in days — the old UI defaulted a
 * vet schedule to 180 and offered only a +/- one-day stepper, so moving to a
 * yearly checkup took 185 taps and the value read as the nonsense
 * "Every 180 days". These are the cadences people actually use; `custom` keeps
 * the stepper reachable for anything else.
 */
const CADENCE_PRESETS: { days: number; label: string }[] = [
  { days: 7, label: "Weekly" },
  { days: 14, label: "2 weeks" },
  { days: 30, label: "Monthly" },
  { days: 90, label: "3 months" },
  { days: 182, label: "6 months" },
  { days: 365, label: "Yearly" },
];

/** Floor "HH:MM" to the hour — the only times the hour-only picker can show.
 *  Matches how the wheel itself parses (18:30 displays as 6 PM). */
function floorToHour(time: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  return m ? `${m[1].padStart(2, "0")}:00` : time;
}

/** Next default time when appending a slot — an hour after the last one, on
 *  the hour so a legacy minute-precision slot can't breed more of itself. */
function nextSlotTime(slots: CareScheduleSlot[]): string {
  const last = slots[slots.length - 1]?.time ?? "08:00";
  const m = /^(\d{1,2}):(\d{2})$/.exec(last);
  const hour = m ? (Number(m[1]) + 1) % 24 : 9;
  return `${String(hour).padStart(2, "0")}:00`;
}

/**
 * Create/edit the schedule for one care item (an action, or one medication).
 * Times are hour-granularity chips that drill into a wheel; feeding slots get
 * a serving picked from a native menu (iOS) or wheel (Android); days are
 * "Every day" with a Custom escape that reveals the per-day pills.
 */
export default function ScheduleEditorSheet({
  pet,
  type,
  medId,
  open,
  onClose,
}: {
  pet: Pet;
  type: ActionType;
  medId?: string;
  open: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { state, setCareSchedule, deleteCareSchedule, toast } = useStore();
  const existing = findSchedule(state.schedules, pet.id, type, medId);
  const canInterval = type === "groomed" || type === "vet";

  const [slots, setSlots] = useState<CareScheduleSlot[]>([]);
  const [daysMask, setDaysMask] = useState(EVERY_DAY_MASK);
  const [daysMode, setDaysMode] = useState<"everyday" | "custom">("everyday");
  const [cadence, setCadence] = useState<"weekly" | "interval">("weekly");
  const [intervalDays, setIntervalDays] = useState(30);
  // True when the cadence isn't one of the presets, so the day stepper shows.
  const [customCadence, setCustomCadence] = useState(false);
  // Index of the slot whose time / serving is being picked — the sheet swaps
  // to a dedicated picker view while one is set. Both null = the form.
  const [pickingTime, setPickingTime] = useState<number | null>(null);
  const [pickingServing, setPickingServing] = useState<number | null>(null);
  // Direction of the last form↔picker swap, so DrillView slides the right way:
  // forward drilling into the picker, back returning to the form.
  const [drillDir, setDrillDir] = useState<"forward" | "back">("forward");
  // False until the first in-sheet swap. Gates the slide so the FORM doesn't
  // animate when the sheet first opens (its initial mount) — only the actual
  // form↔picker swaps do. Reset when the sheet reopens (see the seed effect).
  const [hasSwapped, setHasSwapped] = useState(false);
  const drillTo = (set: (i: number) => void, i: number) => {
    setHasSwapped(true);
    setDrillDir("forward");
    set(i);
  };
  const closePicker = () => {
    setDrillDir("back");
    setPickingTime(null);
    setPickingServing(null);
  };

  // Re-seed the form from the stored schedule each time the sheet opens.
  useEffect(() => {
    if (!open) return;
    setPickingTime(null);
    setPickingServing(null);
    setHasSwapped(false);
    if (existing) {
      setSlots(existing.slots.length > 0 ? existing.slots : [{ time: "08:00" }]);
      setDaysMask(existing.daysMask);
      setDaysMode(existing.intervalDays == null && existing.daysMask !== EVERY_DAY_MASK ? "custom" : "everyday");
      setCadence(existing.intervalDays != null ? "interval" : "weekly");
      const days = existing.intervalDays ?? 30;
      setIntervalDays(days);
      // Schedules saved before the presets existed (e.g. the old 180 default)
      // land on Custom rather than silently snapping to a different cadence.
      setCustomCadence(existing.intervalDays != null && !CADENCE_PRESETS.some((p) => p.days === days));
    } else {
      setSlots((DEFAULT_TIMES[type === "fed" ? 2 : 1] ?? ["08:00"]).map((time) => ({ time })));
      setDaysMask(EVERY_DAY_MASK);
      setDaysMode("everyday");
      setCadence(canInterval ? "interval" : "weekly");
      // 182 = a real 6 months (and a preset). Was 180, which matched no preset
      // and rendered as "Every 180 days".
      setIntervalDays(type === "groomed" ? 14 : 182);
      setCustomCadence(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const label = careItemLabel(pet, type, medId);
  // Cadences of a month or more: per-day times stop being meaningful at that
  // scale (see the Times section below).
  const longCadence = canInterval && cadence === "interval" && intervalDays >= 30;

  const updateSlot = (i: number, patch: Partial<CareScheduleSlot>) =>
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const gramsFor = (frac: number) => Math.round(frac * pet.cupGrams);
  const servingLabel = (grams: number | undefined) => {
    if (grams == null) return "Amount";
    const p = PORTIONS.find((x) => gramsFor(x.frac) === grams);
    return p ? p.label : `${grams} g`;
  };

  // The picker view must show EXACTLY what Done keeps, so opening it first
  // snaps a legacy minute-precision time (saved by the old 5-minute wheel) to
  // the hour the wheel is about to display — otherwise "6:30 PM" rendered as
  // "6 PM", Done was a silent no-op, and 6:00 itself was unreachable (a wheel
  // parked on 6 never fires onChange).
  const openTime = (i: number) => {
    const t = slots[i]?.time;
    if (t != null && t !== floorToHour(t)) updateSlot(i, { time: floorToHour(t) });
    drillTo(setPickingTime, i);
  };

  // Serving is a short fixed list, so it gets the platform's own menu: the
  // native action sheet on iOS, a wheel drill-in (same pattern as times) on
  // Android, where there is no system equivalent this close.
  const openServing = (i: number) => {
    if (Platform.OS === "ios") {
      const options = [...PORTIONS.map((p) => p.label), NO_AMOUNT, "Cancel"];
      ActionSheetIOS.showActionSheetWithOptions(
        { title: `Serving · ${pet.name}`, options, cancelButtonIndex: options.length - 1 },
        (idx) => {
          if (idx == null || idx >= options.length - 1) return;
          updateSlot(i, { grams: idx < PORTIONS.length ? gramsFor(PORTIONS[idx].frac) : undefined });
        },
      );
    } else {
      // Same show-what-you-keep rule as openTime: an amount saved under an old
      // cup size no longer reverse-maps to any portion, and the wheel would
      // park on "No set amount" while the slot still carried grams. Snap it to
      // the closest portion under the CURRENT cup size first.
      const grams = slots[i]?.grams;
      if (grams != null && !PORTIONS.some((p) => gramsFor(p.frac) === grams)) {
        const closest = PORTIONS.reduce((best, p) =>
          Math.abs(gramsFor(p.frac) - grams) < Math.abs(gramsFor(best.frac) - grams) ? p : best,
        );
        updateSlot(i, { grams: gramsFor(closest.frac) });
      }
      drillTo(setPickingServing, i);
    }
  };

  const save = () => {
    if (slots.length === 0) return;
    const interval = canInterval && cadence === "interval";
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    setCareSchedule({
      id: existing?.id ?? Crypto.randomUUID(),
      petId: pet.id,
      type,
      medId,
      slots: [...slots].sort((a, b) => a.time.localeCompare(b.time)),
      daysMask: interval || daysMode === "everyday" ? EVERY_DAY_MASK : daysMask || EVERY_DAY_MASK,
      intervalDays: interval ? Math.max(1, intervalDays) : undefined,
      anchorTs: interval ? (existing?.anchorTs ?? startOfToday.getTime()) : undefined,
      // Long cadences persist the maximum rather than the fixed 30 — that
      // keeps the ✓ up instead of expiring 30 min before a 6-month slot. 720
      // is the ceiling the 0017 migration's check constraint allows.
      graceMinutes: longCadence ? 720 : GRACE_MINUTES,
    });
    toast("clock", `${label} schedule saved`, `${pet.name} · everyone's reminders updated`);
    onClose();
  };

  const remove = () => {
    if (existing) {
      deleteCareSchedule(existing.id);
      toast("clock", "Schedule removed", `${label} goes back to simple daily counts`);
    }
    onClose();
  };

  /**
   * "Repeats" — the cadence controls. Rendered ABOVE the times for long
   * cadences (where "how often" is the real question) and below them otherwise,
   * so it's defined once here rather than duplicated at both positions.
   */
  const cadenceSection = (
    <>
      {canInterval ? (
        <>
          <FieldLabel>Repeats</FieldLabel>
          <Segmented
            options={[
              { value: "interval", label: "Every so often" },
              { value: "weekly", label: "Days of week" },
            ]}
            value={cadence}
            onChange={setCadence}
          />
        </>
      ) : null}

      {canInterval && cadence === "interval" ? (
        <View style={styles.cadenceWrap}>
          {/* Presets first — a vet visit is "every 6 months", not "every 182
              days". Custom reveals the day stepper for anything unusual. */}
          <View style={styles.cadenceRow}>
            {CADENCE_PRESETS.map((p) => (
              <SelectableChip
                key={p.days}
                label={p.label}
                selected={!customCadence && intervalDays === p.days}
                onPress={() => {
                  setCustomCadence(false);
                  setIntervalDays(p.days);
                }}
              />
            ))}
            <SelectableChip label="Custom" selected={customCadence} onPress={() => setCustomCadence(true)} />
          </View>
          {customCadence ? (
            <View style={styles.intervalRow}>
              <Stepper
                label={describeCadence(intervalDays)}
                onDec={() => setIntervalDays((d) => Math.max(1, d - 1))}
                onInc={() => setIntervalDays((d) => Math.min(730, d + 1))}
                decDisabled={intervalDays <= 1}
                accessibilityLabel="Repeat every N days"
              />
            </View>
          ) : null}
          <Text style={styles.hint}>
            {intervalDays >= 60
              ? `We'll remind everyone when it's due — about ${describeCadence(intervalDays).toLowerCase()}.`
              : `Repeats ${describeCadence(intervalDays).toLowerCase()}, starting today.`}
          </Text>
        </View>
      ) : (
        <>
          <FieldLabel>Days</FieldLabel>
          <Segmented
            options={[
              { value: "everyday", label: "Every day" },
              { value: "custom", label: "Custom days" },
            ]}
            value={daysMode}
            onChange={setDaysMode}
          />
          {daysMode === "custom" ? (
            <View style={styles.daysRow}>
              {DAY_LETTERS.map((letter, day) => (
                <SelectableChip
                  key={day}
                  label={letter}
                  selected={maskHasDay(daysMask, day)}
                  onPress={() => setDaysMask((m) => m ^ (1 << day))}
                />
              ))}
            </View>
          ) : null}
        </>
      )}
    </>
  );

  const pickingTimeActive = pickingTime != null && slots[pickingTime] != null;
  const pickingServingActive = pickingServing != null && slots[pickingServing] != null;
  const picking = pickingTimeActive || pickingServingActive;

  // Picking takes over the whole sheet instead of expanding a wheel inline
  // (which stretched the sheet and pushed the form around) and instead of a
  // nested Sheet (two stacked RN Modals is a known-fragile pattern here). It
  // cross-slides in over the form via DrillView.
  const timePickerBody = pickingTimeActive ? (
    <>
      <SheetTitle>{slots.length > 1 ? `Time ${pickingTime! + 1}` : "Time"}</SheetTitle>
      <SheetSubtitle>
        {label} · {pet.name}
      </SheetSubtitle>
      <View style={styles.pickerBody}>
        <TimeWheelPicker hourOnly value={slots[pickingTime!].time} onChange={(time) => updateSlot(pickingTime!, { time })} />
      </View>
      <SheetFooter>
        <AccentButton onPress={closePicker}>Done</AccentButton>
      </SheetFooter>
    </>
  ) : null;

  // Android's serving picker (iOS uses the native action sheet, no drill).
  const servingPickerBody = pickingServingActive ? (
    <>
      <SheetTitle>Serving</SheetTitle>
      <SheetSubtitle>
        {label} · {pet.name}
      </SheetSubtitle>
      <View style={styles.pickerBody}>
        <SingleWheelPicker
          values={[NO_AMOUNT, ...PORTIONS.map((p) => p.label)]}
          value={(() => {
            const grams = slots[pickingServing!].grams;
            const p = grams != null ? PORTIONS.find((x) => gramsFor(x.frac) === grams) : undefined;
            return p ? p.label : NO_AMOUNT;
          })()}
          onChange={(v) => {
            const p = PORTIONS.find((x) => x.label === v);
            updateSlot(pickingServing!, { grams: p ? gramsFor(p.frac) : undefined });
          }}
          width={220}
        />
      </View>
      <SheetFooter>
        <AccentButton onPress={closePicker}>Done</AccentButton>
      </SheetFooter>
    </>
  ) : null;

  const formBody = (
    <>
      <SheetTitle>{label} schedule</SheetTitle>
      <SheetSubtitle>
        {longCadence
          ? `For ${pet.name} — everyone gets reminded when it's due`
          : `For ${pet.name} — the family gets reminded at these times`}
      </SheetSubtitle>

      {/* At a monthly-or-longer cadence the interesting question is "how often",
          so Repeats leads and Times shrinks to a single "remind me at" row.
          Below that, times ARE the schedule, so they stay on top. */}
      {longCadence ? cadenceSection : null}

      <FieldLabel>{longCadence ? "Remind at" : "Times"}</FieldLabel>
      <View style={styles.slotList}>
        {slots.map((slot, i) => (
          <View key={i} style={styles.slotRow}>
            {/* Tapping the time drills into the wheel picker (DrillView slide
                below) rather than expanding inline — an inline wheel grew this
                sheet's height and shoved the rest of the form around. */}
            <PressableScale
              style={styles.chipFlex}
              onPress={() => openTime(i)}
              accessibilityRole="button"
              accessibilityLabel={`Time ${i + 1}: ${formatSlotTime(slot.time)}. Tap to change`}
            >
              <View style={styles.valueChip}>
                <Text style={styles.valueChipLabel}>{formatSlotTime(slot.time)}</Text>
                <Icon name="chevron-down" size={13} color={colors.label3} />
              </View>
            </PressableScale>
            {type === "fed" ? (
              <PressableScale
                style={styles.chipFlex}
                onPress={() => openServing(i)}
                accessibilityRole="button"
                accessibilityLabel={`Serving for time ${i + 1}: ${servingLabel(slot.grams)}. Tap to change`}
              >
                <View style={styles.valueChip}>
                  <Text style={[styles.valueChipLabel, slot.grams == null && styles.valueChipEmpty]}>
                    {servingLabel(slot.grams)}
                  </Text>
                  <Icon name="chevron-down" size={13} color={colors.label3} />
                </View>
              </PressableScale>
            ) : null}
            {slots.length > 1 ? (
              <PressableScale
                scaleTo={PRESS_SCALE_SMALL}
                onPress={() => setSlots((prev) => prev.filter((_, idx) => idx !== i))}
                accessibilityRole="button"
                accessibilityLabel={`Remove time ${i + 1}`}
                hitSlop={8}
              >
                <View style={styles.removeSlot}>
                  <Icon name="xmark" size={15} color={colors.label3} />
                </View>
              </PressableScale>
            ) : null}
          </View>
        ))}
      </View>
      {slots.length < MAX_SLOTS ? (
        <View style={styles.addTime}>
          <SmallButton
            label="Add time"
            onPress={() => setSlots((prev) => [...prev, { time: nextSlotTime(prev) }])}
          />
        </View>
      ) : null}

      {/* Already rendered above the times when the cadence is long. */}
      {longCadence ? null : cadenceSection}

      {/* The old per-schedule "grace window" stepper, folded into a fixed
          30 minutes (GRACE_MINUTES) — the note keeps the behavior discoverable
          without the knob. Meaningless at long cadences, where the ✓ simply
          holds until the next visit is due. */}
      {longCadence ? null : (
        <Footnote style={styles.note}>
          A little wiggle room is built in: logging up to 30 minutes before a time still counts, and a ✓ stays
          until 30 minutes before the next one.
        </Footnote>
      )}

      <SheetFooter>
        <View style={{ gap: 10 }}>
          <AccentButton
            disabled={slots.length === 0 || (cadence === "weekly" && daysMode === "custom" && daysMask === 0)}
            onPress={save}
          >
            {existing ? "Save schedule" : "Set schedule"}
          </AccentButton>
          {existing ? (
            <AccentButton variant="gray" onPress={remove}>
              {/* Red label on the gray fill — the stock iOS destructive-secondary
                  look; AccentButton renders non-string children as-is. */}
              <Text style={styles.removeLabel}>Remove schedule</Text>
            </AccentButton>
          ) : null}
        </View>
      </SheetFooter>
    </>
  );

  // One Sheet for both views so the transition happens INSIDE a single modal;
  // DrillView (keyed on which view is up) cross-slides the form and the wheel
  // picker. The FORM's initial mount (sheet just opened) is NOT animated — only
  // the actual form↔picker swaps are (`hasSwapped`), so opening the sheet
  // doesn't slide the form in. The picker is only ever reached by a tap, so it
  // always animates. The sheet scrolls for the (tall) form and stops scrolling
  // while the picker is up so the wheels' own vertical pan isn't fighting an
  // outer scroller; `drillClip` hides the horizontal slide's overflow.
  return (
    <Sheet open={open} onClose={onClose} scrollable={!picking}>
      <View style={styles.drillClip}>
        {picking ? (
          <DrillView key="picker" direction={drillDir}>
            {pickingTimeActive ? timePickerBody : servingPickerBody}
          </DrillView>
        ) : (
          <DrillView key="form" direction={drillDir} animate={hasSwapped}>
            {formBody}
          </DrillView>
        )}
      </View>
    </Sheet>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    // Clips the horizontal slide so a drilling view can't spill past the sheet's
    // edges mid-transition.
    drillClip: { overflow: "hidden" },
    slotList: { gap: 12 },
    slotRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    chipFlex: { flex: 1 },
    valueChip: {
      minHeight: 48,
      paddingHorizontal: 14,
      borderRadius: radius.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: "rgba(28, 28, 35, 0.1)",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    valueChipLabel: { fontSize: 16, fontFamily: font.semibold, color: colors.label },
    valueChipEmpty: { color: colors.label2 },
    // The drilled-in wheel sits in an inset card (same surface as the slot's
    // chips) so it reads as that slot's own editing surface, not a floating
    // control. Card bg keeps the wheel's fill selection band visible.
    pickerBody: { marginTop: 16, borderRadius: radius.md, backgroundColor: colors.card, paddingVertical: 8, ...cardShadow },
    removeSlot: { width: 32, height: 44, alignItems: "center", justifyContent: "center" },
    addTime: { marginTop: 12, alignSelf: "flex-start" },
    daysRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
    intervalRow: { flexDirection: "row" },
    cadenceWrap: { gap: 12 },
    cadenceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    hint: { marginTop: 8, paddingHorizontal: 2, fontSize: 12, fontFamily: font.regular, color: colors.label2, lineHeight: 17 },
    note: { marginTop: 16, paddingHorizontal: 2 },
    removeLabel: { fontSize: 17, fontFamily: font.semibold, color: colors.red },
  });
