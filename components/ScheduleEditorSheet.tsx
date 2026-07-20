import * as Crypto from "expo-crypto";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Sheet from "@/components/Sheet";
import { Icon } from "@/components/Icons";
import { Stepper } from "@/components/TimeStepper";
import { TimeWheelPicker } from "@/components/WheelPicker";
import {
  AccentButton,
  FieldLabel,
  PRESS_SCALE_SMALL,
  PressableScale,
  Segmented,
  SelectableChip,
  SheetFooter,
  SheetSubtitle,
  SheetTitle,
  SmallButton,
  TextField,
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
import { cardShadow, colors, font, radius } from "@/lib/theme";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const MAX_SLOTS = 12;

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

/** Next default time when appending a slot — an hour after the last one. */
function nextSlotTime(slots: CareScheduleSlot[]): string {
  const last = slots[slots.length - 1]?.time ?? "08:00";
  const m = /^(\d{1,2}):(\d{2})$/.exec(last);
  const total = m ? (Number(m[1]) * 60 + Number(m[2]) + 60) % 1440 : 9 * 60;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Create/edit the schedule for one care item (an action, or one medication).
 * Times, optional slot names, per-slot portions for feeding, days of week (or
 * an every-N-days cadence for grooming/vet), and the grace window.
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
  const { state, setCareSchedule, deleteCareSchedule, toast } = useStore();
  const existing = findSchedule(state.schedules, pet.id, type, medId);
  const canInterval = type === "groomed" || type === "vet";

  const [slots, setSlots] = useState<CareScheduleSlot[]>([]);
  const [daysMask, setDaysMask] = useState(EVERY_DAY_MASK);
  const [cadence, setCadence] = useState<"weekly" | "interval">("weekly");
  const [intervalDays, setIntervalDays] = useState(30);
  // True when the cadence isn't one of the presets, so the day stepper shows.
  const [customCadence, setCustomCadence] = useState(false);
  const [grace, setGrace] = useState(30);
  // Index of the slot whose time is being picked — the sheet swaps to a
  // dedicated wheel view while this is set. Null = editing the schedule form.
  const [pickingSlot, setPickingSlot] = useState<number | null>(null);

  // Re-seed the form from the stored schedule each time the sheet opens.
  useEffect(() => {
    if (!open) return;
    setPickingSlot(null);
    if (existing) {
      setSlots(existing.slots.length > 0 ? existing.slots : [{ time: "08:00" }]);
      setDaysMask(existing.daysMask);
      setCadence(existing.intervalDays != null ? "interval" : "weekly");
      const days = existing.intervalDays ?? 30;
      setIntervalDays(days);
      // Schedules saved before the presets existed (e.g. the old 180 default)
      // land on Custom rather than silently snapping to a different cadence.
      setCustomCadence(existing.intervalDays != null && !CADENCE_PRESETS.some((p) => p.days === days));
      setGrace(existing.graceMinutes);
    } else {
      setSlots((DEFAULT_TIMES[type === "fed" ? 2 : 1] ?? ["08:00"]).map((time) => ({ time })));
      setDaysMask(EVERY_DAY_MASK);
      setCadence(canInterval ? "interval" : "weekly");
      // 182 = a real 6 months (and a preset). Was 180, which matched no preset
      // and rendered as "Every 180 days".
      setIntervalDays(type === "groomed" ? 14 : 182);
      setCustomCadence(false);
      setGrace(30);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const label = careItemLabel(pet, type, medId);
  // Cadences of a month or more: the "times" and grace-window controls stop
  // being meaningful at that scale (see the Times/Grace sections below).
  const longCadence = canInterval && cadence === "interval" && intervalDays >= 30;

  const updateSlot = (i: number, patch: Partial<CareScheduleSlot>) =>
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

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
      daysMask: interval ? EVERY_DAY_MASK : daysMask || EVERY_DAY_MASK,
      intervalDays: interval ? Math.max(1, intervalDays) : undefined,
      anchorTs: interval ? (existing?.anchorTs ?? startOfToday.getTime()) : undefined,
      // Long cadences hide the grace stepper, so persist the maximum rather than
      // whatever minute value happened to be in state — that keeps the ✓ up
      // instead of expiring 30 min before a 6-month slot. 720 is the ceiling the
      // 0017 migration's check constraint allows; a larger value is rejected.
      graceMinutes: longCadence ? 720 : grace,
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
          <Text style={styles.graceHint}>
            {intervalDays >= 60
              ? `We'll remind everyone when it's due — about ${describeCadence(intervalDays).toLowerCase()}.`
              : `Repeats ${describeCadence(intervalDays).toLowerCase()}, starting today.`}
          </Text>
        </View>
      ) : (
        <>
          <FieldLabel>Days</FieldLabel>
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
        </>
      )}
    </>
  );

  // Time picking takes over the whole sheet instead of expanding a wheel inline
  // (which stretched the sheet and pushed the form around) and instead of a
  // nested Sheet (two stacked RN Modals is a known-fragile pattern here).
  // scrollable={false} while the wheel is up so the wheel's own ScrollView
  // columns aren't fighting the sheet's scroller for the same pan.
  if (pickingSlot != null && slots[pickingSlot]) {
    const slot = slots[pickingSlot];
    return (
      <Sheet open={open} onClose={onClose} scrollable={false}>
        <SheetTitle>{slot.label?.trim() ? slot.label : `Time ${pickingSlot + 1}`}</SheetTitle>
        <SheetSubtitle>
          {label} · {pet.name}
        </SheetSubtitle>
        <View style={styles.pickerBody}>
          <TimeWheelPicker value={slot.time} onChange={(time) => updateSlot(pickingSlot, { time })} />
        </View>
        <SheetFooter>
          <AccentButton onPress={() => setPickingSlot(null)}>Done</AccentButton>
        </SheetFooter>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={onClose}>
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
          <View key={i} style={styles.slotBlock}>
            <View style={styles.slotRow}>
              {/* Tapping the time opens a small dedicated picker sheet rather
                  than expanding inline — an inline wheel grew this sheet's
                  height and shoved the rest of the form around. */}
              <PressableScale
                onPress={() => setPickingSlot(i)}
                accessibilityRole="button"
                accessibilityLabel={`Time ${i + 1}: ${formatSlotTime(slot.time)}. Tap to change`}
              >
                <View style={styles.timeChip}>
                  <Text style={styles.timeChipLabel}>{formatSlotTime(slot.time)}</Text>
                </View>
              </PressableScale>
              <TextField
                value={slot.label ?? ""}
                onChangeText={(t) => updateSlot(i, { label: t || undefined })}
                placeholder={type === "fed" ? "Breakfast…" : "Name (optional)"}
                style={styles.slotName}
              />
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
            {type === "fed" ? (
              <View style={styles.portionRow}>
                {PORTIONS.map((p) => {
                  const grams = Math.round(p.frac * pet.cupGrams);
                  const selected = slot.grams === grams;
                  return (
                    <SelectableChip
                      key={p.value}
                      label={p.label}
                      selected={selected}
                      onPress={() => updateSlot(i, { grams: selected ? undefined : grams })}
                    />
                  );
                })}
              </View>
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

      {/* A minute-level grace window only means something for items that recur
          within a day or two. On a 6-monthly vet visit "stays checked until 30
          min before the next time" is nonsense — the checkmark should simply
          hold until the next visit is due. */}
      {longCadence ? null : (
        <>
          <FieldLabel>Grace window</FieldLabel>
          <View style={styles.intervalRow}>
            <Stepper
              label={grace === 0 ? "Off" : `${grace} min`}
              onDec={() => setGrace((g) => Math.max(0, g - 15))}
              onInc={() => setGrace((g) => Math.min(720, g + 15))}
              decDisabled={grace <= 0}
              accessibilityLabel="Grace window in minutes"
            />
          </View>
          <Text style={styles.graceHint}>
            After logging, this stays checked until {grace === 0 ? "the next time arrives" : `${grace} min before the next time`}.
          </Text>
        </>
      )}

      <SheetFooter>
        <View style={{ gap: 10 }}>
          <AccentButton disabled={slots.length === 0 || (daysMask === 0 && cadence === "weekly")} onPress={save}>
            {existing ? "Save schedule" : "Set schedule"}
          </AccentButton>
          {existing ? (
            <AccentButton variant="gray" onPress={remove}>
              Remove schedule
            </AccentButton>
          ) : null}
        </View>
      </SheetFooter>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  slotList: { gap: 14 },
  slotBlock: { gap: 8 },
  slotRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  timeChip: {
    minWidth: 92,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    ...cardShadow,
  },
  timeChipLabel: { fontSize: 16, fontFamily: font.semibold, color: colors.label },
  pickerBody: { marginTop: 12 },
  slotName: { flex: 1, marginTop: 0 },
  removeSlot: { width: 32, height: 44, alignItems: "center", justifyContent: "center" },
  portionRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingLeft: 2 },
  addTime: { marginTop: 10, alignSelf: "flex-start" },
  daysRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  intervalRow: { flexDirection: "row" },
  cadenceWrap: { gap: 10 },
  cadenceRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  graceHint: { marginTop: 8, paddingHorizontal: 2, fontSize: 12, fontFamily: font.regular, color: colors.label3, lineHeight: 17 },
});
