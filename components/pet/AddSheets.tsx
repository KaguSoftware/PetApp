import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { addMed, addVaccination, addVetVisit } from "@/data";
import { isValidDateString, toDateString } from "@/lib/format";
import { PillButton, Sheet, spacing, Text, TextField } from "@/ui";

interface SheetProps {
  petId: string;
  open: boolean;
  onClose: () => void;
}

function Form({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <Sheet open={open} onClose={onClose}>
      <ScrollView bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        {children}
      </ScrollView>
    </Sheet>
  );
}

function DateInput({ label, value, onChange, optional = false }: { label: string; value: string; onChange: (v: string) => void; optional?: boolean }) {
  return (
    <>
      <TextField
        label={`${label} (YYYY-MM-DD)`}
        value={value}
        onChangeText={onChange}
        placeholder={optional ? "Optional" : "2026-10-15"}
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
      />
      {value.trim() !== "" && !isValidDateString(value) ? (
        <Text variant="callout" tone="danger">
          Use the format 2026-10-15.
        </Text>
      ) : null}
    </>
  );
}

const dateOk = (v: string, optional = false) => (optional && v.trim() === "") || isValidDateString(v);

function AddVaccinationForm({ petId, open, onClose }: SheetProps) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(() => toDateString(Date.now()));
  const [nextDue, setNextDue] = useState("");
  const ok = name.trim().length > 0 && dateOk(date) && dateOk(nextDue, true);
  return (
    <Form title="Add vaccination" open={open} onClose={onClose}>
      <TextField label="Vaccine" value={name} onChangeText={setName} placeholder="Rabies" />
      <DateInput label="Given on" value={date} onChange={setDate} />
      <DateInput label="Next due" value={nextDue} onChange={setNextDue} optional />
      <PillButton
        label="Save"
        disabled={!ok}
        onPress={() => {
          onClose();
          addVaccination({ petId, name: name.trim(), date: date.trim(), nextDue: nextDue.trim() || null }).catch(() => undefined);
        }}
      />
    </Form>
  );
}

function AddVetVisitForm({ petId, open, onClose }: SheetProps) {
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(() => toDateString(Date.now()));
  const [notes, setNotes] = useState("");
  const ok = reason.trim().length > 0 && dateOk(date);
  return (
    <Form title="Add vet visit" open={open} onClose={onClose}>
      <TextField label="Reason" value={reason} onChangeText={setReason} placeholder="Check-up" />
      <DateInput label="Date" value={date} onChange={setDate} />
      <TextField label="Notes" multiline value={notes} onChangeText={setNotes} placeholder="Optional" />
      <PillButton
        label="Save"
        disabled={!ok}
        onPress={() => {
          onClose();
          addVetVisit({ petId, date: date.trim(), reason: reason.trim(), notes: notes.trim() || null }).catch(() => undefined);
        }}
      />
    </Form>
  );
}

function AddMedForm({ petId, open, onClose }: SheetProps) {
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [schedule, setSchedule] = useState("");
  return (
    <Form title="Add medication" open={open} onClose={onClose}>
      <TextField label="Name" value={name} onChangeText={setName} placeholder="Heartworm tablet" />
      <TextField label="Dose" value={dose} onChangeText={setDose} placeholder="Optional" />
      <TextField label="Schedule" value={schedule} onChangeText={setSchedule} placeholder="e.g. Monthly" />
      <PillButton
        label="Save"
        disabled={name.trim().length === 0}
        onPress={() => {
          onClose();
          addMed({ petId, name: name.trim(), dose: dose.trim() || null, schedule: schedule.trim() || null, active: true }).catch(
            () => undefined,
          );
        }}
      />
    </Form>
  );
}

export type AddKind = "vaccination" | "vet" | "med";

/** One host for the three add forms; remounted per open so fields start empty. */
export function AddSheets({ petId, kind, rev, onClose }: { petId: string; kind: AddKind | null; rev: number; onClose: () => void }) {
  return (
    <>
      <AddVaccinationForm key={`v${rev}`} petId={petId} open={kind === "vaccination"} onClose={onClose} />
      <AddVetVisitForm key={`r${rev}`} petId={petId} open={kind === "vet"} onClose={onClose} />
      <AddMedForm key={`m${rev}`} petId={petId} open={kind === "med"} onClose={onClose} />
    </>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md, paddingBottom: spacing.sm },
});
