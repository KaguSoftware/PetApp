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
import { careItemLabel, findSchedule, formatSlotTime } from "@/lib/careStatus";
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
  const [grace, setGrace] = useState(30);
  // Which slot's time wheel is expanded (only one at a time). Null = none.
  const [openWheel, setOpenWheel] = useState<number | null>(null);

  // Re-seed the form from the stored schedule each time the sheet opens.
  useEffect(() => {
    if (!open) return;
    setOpenWheel(null);
    if (existing) {
      setSlots(existing.slots.length > 0 ? existing.slots : [{ time: "08:00" }]);
      setDaysMask(existing.daysMask);
      setCadence(existing.intervalDays != null ? "interval" : "weekly");
      setIntervalDays(existing.intervalDays ?? 30);
      setGrace(existing.graceMinutes);
    } else {
      setSlots((DEFAULT_TIMES[type === "fed" ? 2 : 1] ?? ["08:00"]).map((time) => ({ time })));
      setDaysMask(EVERY_DAY_MASK);
      setCadence(canInterval ? "interval" : "weekly");
      setIntervalDays(type === "groomed" ? 14 : 180);
      setGrace(30);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const label = careItemLabel(pet, type, medId);

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
      graceMinutes: grace,
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

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetTitle>{label} schedule</SheetTitle>
      <SheetSubtitle>
        For {pet.name} — the family gets reminded at these times
      </SheetSubtitle>

      <FieldLabel>Times</FieldLabel>
      <View style={styles.slotList}>
        {slots.map((slot, i) => (
          <View key={i} style={styles.slotBlock}>
            <View style={styles.slotRow}>
              {/* Tap the time to spin it — one wheel is open at a time so a
                  10-meal schedule doesn't become ten stacked pickers. */}
              <PressableScale
                onPress={() => setOpenWheel((w) => (w === i ? null : i))}
                accessibilityRole="button"
                accessibilityLabel={`Time ${i + 1}: ${formatSlotTime(slot.time)}. Tap to change`}
                accessibilityState={{ expanded: openWheel === i }}
              >
                <View style={[styles.timeChip, openWheel === i && styles.timeChipActive]}>
                  <Text style={[styles.timeChipLabel, openWheel === i && styles.timeChipLabelActive]}>
                    {formatSlotTime(slot.time)}
                  </Text>
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
            {openWheel === i ? (
              <TimeWheelPicker value={slot.time} onChange={(time) => updateSlot(i, { time })} />
            ) : null}
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

      {canInterval ? (
        <>
          <FieldLabel>Repeats</FieldLabel>
          <Segmented
            options={[
              { value: "weekly", label: "Days of week" },
              { value: "interval", label: "Every few days" },
            ]}
            value={cadence}
            onChange={setCadence}
          />
        </>
      ) : null}

      {canInterval && cadence === "interval" ? (
        <View style={styles.intervalRow}>
          <Stepper
            label={intervalDays === 1 ? "Every day" : `Every ${intervalDays} days`}
            onDec={() => setIntervalDays((d) => Math.max(1, d - 1))}
            onInc={() => setIntervalDays((d) => Math.min(365, d + 1))}
            decDisabled={intervalDays <= 1}
            accessibilityLabel="Repeat every N days"
          />
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
    borderWidth: 2,
    borderColor: "transparent",
    ...cardShadow,
  },
  timeChipActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  timeChipLabel: { fontSize: 16, fontFamily: font.semibold, color: colors.label },
  timeChipLabelActive: { color: colors.accent },
  slotName: { flex: 1, marginTop: 0 },
  removeSlot: { width: 32, height: 44, alignItems: "center", justifyContent: "center" },
  portionRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingLeft: 2 },
  addTime: { marginTop: 10, alignSelf: "flex-start" },
  daysRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  intervalRow: { flexDirection: "row" },
  graceHint: { marginTop: 8, paddingHorizontal: 2, fontSize: 12, fontFamily: font.regular, color: colors.label3, lineHeight: 17 },
});
