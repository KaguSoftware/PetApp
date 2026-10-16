import { useState } from "react";
import { Keyboard, View } from "react-native";
import type { Pet } from "@/data";
import { addMonths, dateOf, isoOf } from "./dates";
import { Chip, Field, formStyles, PickerField, SavePill } from "./parts";
import { saveVaccination, saveVetVisit } from "./save";

/** Native date pickers never go past today for something that already happened. */
const endOfToday = () => new Date(new Date().setHours(23, 59, 59, 999));

export function VetForm({ pet, onDone }: { pet: Pet; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(() => new Date());
  const valid = reason.trim().length > 0;

  const save = () => {
    if (!valid) return;
    Keyboard.dismiss();
    saveVetVisit(pet, { date: isoOf(date), reason: reason.trim(), notes: notes.trim() || null });
    onDone();
  };

  return (
    <View style={formStyles.body}>
      <PickerField label="DATE" mode="date" value={date} onChange={setDate} maximumDate={endOfToday()} />
      <Field label="REASON" value={reason} onChangeText={setReason} placeholder="e.g. Annual check-up" maxLength={120} />
      <Field label="NOTES (OPTIONAL)" value={notes} onChangeText={setNotes} maxLength={300} />
      <SavePill onPress={save} disabled={!valid} />
    </View>
  );
}

const PRESETS: { label: string; months: number | null }[] = [
  { label: "None", months: null },
  { label: "6 months", months: 6 },
  { label: "1 year", months: 12 },
  { label: "3 years", months: 36 },
];

export function VaccineForm({ pet, onDone }: { pet: Pet; onDone: () => void }) {
  const [name, setName] = useState("");
  const [given, setGiven] = useState(() => new Date());
  // null = no reminder. A preset fills the date, which the native picker can then fine-tune.
  const [nextDue, setNextDue] = useState<Date | null>(null);
  const [preset, setPreset] = useState<number | null>(null);
  const valid = name.trim().length > 0;

  const pickPreset = (months: number | null) => {
    setPreset(months);
    setNextDue(months ? dateOf(addMonths(isoOf(given), months)) : null);
  };
  const changeGiven = (d: Date) => {
    setGiven(d);
    // A preset stays relative to the new given date; a hand-picked due date is left alone.
    if (preset) setNextDue(dateOf(addMonths(isoOf(d), preset)));
  };

  const save = () => {
    if (!valid) return;
    Keyboard.dismiss();
    saveVaccination(pet, { name: name.trim(), date: isoOf(given), nextDue: nextDue ? isoOf(nextDue) : null });
    onDone();
  };

  return (
    <View style={formStyles.body}>
      <Field label="NAME" value={name} onChangeText={setName} placeholder="e.g. Rabies" maxLength={120} />
      <PickerField label="GIVEN" mode="date" value={given} onChange={changeGiven} maximumDate={endOfToday()} />
      <View style={formStyles.chips}>
        {PRESETS.map((n) => (
          <Chip key={n.label} label={n.months ? `Due in ${n.label}` : "No reminder"} selected={preset === n.months && (n.months !== null || nextDue === null)} onPress={() => pickPreset(n.months)} />
        ))}
      </View>
      {nextDue ? (
        <PickerField
          label="NEXT DUE"
          mode="date"
          value={nextDue}
          minimumDate={given}
          onChange={(d) => {
            setPreset(null);
            setNextDue(d);
          }}
        />
      ) : null}
      <SavePill onPress={save} disabled={!valid} />
    </View>
  );
}
