import { useState } from "react";
import { Keyboard, View } from "react-native";
import type { Pet } from "@/data";
import { Text } from "@/ui";
import { addMonths, dayLabel, isoDay } from "./dates";
import { Chip, Field, formStyles, SavePill, Stepper } from "./parts";
import { saveVaccination, saveVetVisit } from "./save";

/** Date row: Today by default, back one day at a time, never into the future. */
function DateStepper({ offset, onChange }: { offset: number; onChange: (offset: number) => void }) {
  return (
    <Stepper
      label="DATE"
      value={dayLabel(offset)}
      minusLabel="Previous day"
      plusLabel="Next day"
      onMinus={() => onChange(offset - 1)}
      onPlus={offset < 0 ? () => onChange(Math.min(0, offset + 1)) : undefined}
    />
  );
}

export function VetForm({ pet, onDone }: { pet: Pet; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [offset, setOffset] = useState(0);
  const valid = reason.trim().length > 0;

  const save = () => {
    if (!valid) return;
    Keyboard.dismiss();
    saveVetVisit(pet, { date: isoDay(offset), reason: reason.trim(), notes: notes.trim() || null });
    onDone();
  };

  return (
    <View style={formStyles.body}>
      <DateStepper offset={offset} onChange={setOffset} />
      <Field label="REASON" value={reason} onChangeText={setReason} placeholder="e.g. Annual check-up" maxLength={120} />
      <Field label="NOTES (OPTIONAL)" value={notes} onChangeText={setNotes} maxLength={300} />
      <SavePill onPress={save} disabled={!valid} />
    </View>
  );
}

const NEXT_DUE: { label: string; months: number | null }[] = [
  { label: "No reminder", months: null },
  { label: "6 months", months: 6 },
  { label: "1 year", months: 12 },
  { label: "3 years", months: 36 },
];

export function VaccineForm({ pet, onDone }: { pet: Pet; onDone: () => void }) {
  const [name, setName] = useState("");
  const [offset, setOffset] = useState(0);
  const [nextMonths, setNextMonths] = useState<number | null>(null);
  const valid = name.trim().length > 0;

  const save = () => {
    if (!valid) return;
    Keyboard.dismiss();
    const date = isoDay(offset);
    saveVaccination(pet, { name: name.trim(), date, nextDue: nextMonths ? addMonths(date, nextMonths) : null });
    onDone();
  };

  return (
    <View style={formStyles.body}>
      <Field label="NAME" value={name} onChangeText={setName} placeholder="e.g. Rabies" maxLength={120} />
      <DateStepper offset={offset} onChange={setOffset} />
      <Text variant="caption" tone="inverse2">
        NEXT DUE
      </Text>
      <View style={formStyles.chips}>
        {NEXT_DUE.map((n) => (
          <Chip key={n.label} label={n.label} selected={nextMonths === n.months} onPress={() => setNextMonths(n.months)} />
        ))}
      </View>
      <SavePill onPress={save} disabled={!valid} />
    </View>
  );
}
