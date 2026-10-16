import { router } from "expo-router";
import { useState } from "react";
import { addMed, addVaccination, addVetVisit } from "@/data";
import { toDateString } from "@/lib/format";
import { DateField, layout, PillButton, SheetScreen, TextField } from "@/ui";
import { StyleSheet } from "react-native";

export type AddKind = "vaccination" | "vet" | "med";

export function isAddKind(v: unknown): v is AddKind {
  return v === "vaccination" || v === "vet" || v === "med";
}

const close = () => (router.canGoBack() ? router.back() : router.replace("/home"));
const today = () => new Date();

function VaccinationForm({ petId }: { petId: string }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(() => toDateString(Date.now()));
  const [nextDue, setNextDue] = useState("");
  return (
    <SheetScreen title="Add vaccination">
      <TextField label="Vaccine" value={name} onChangeText={setName} placeholder="Rabies" />
      <DateField label="Given on" value={date} onChange={setDate} maximumDate={today()} />
      <DateField label="Next due" value={nextDue} onChange={setNextDue} optional />
      <PillButton
        label="Save"
        style={styles.save}
        disabled={name.trim().length === 0}
        onPress={() => {
          close();
          addVaccination({ petId, name: name.trim(), date, nextDue: nextDue || null }).catch(() => undefined);
        }}
      />
    </SheetScreen>
  );
}

function VetVisitForm({ petId }: { petId: string }) {
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(() => toDateString(Date.now()));
  const [notes, setNotes] = useState("");
  return (
    <SheetScreen title="Add vet visit">
      <TextField label="Reason" value={reason} onChangeText={setReason} placeholder="Check-up" />
      <DateField label="Date" value={date} onChange={setDate} />
      <TextField label="Notes" multiline value={notes} onChangeText={setNotes} placeholder="Optional" />
      <PillButton
        label="Save"
        style={styles.save}
        disabled={reason.trim().length === 0}
        onPress={() => {
          close();
          addVetVisit({ petId, date, reason: reason.trim(), notes: notes.trim() || null }).catch(() => undefined);
        }}
      />
    </SheetScreen>
  );
}

function MedForm({ petId }: { petId: string }) {
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [schedule, setSchedule] = useState("");
  return (
    <SheetScreen title="Add medication">
      <TextField label="Name" value={name} onChangeText={setName} placeholder="Heartworm tablet" />
      <TextField label="Dose" value={dose} onChangeText={setDose} placeholder="Optional" />
      <TextField label="Schedule" value={schedule} onChangeText={setSchedule} placeholder="e.g. Monthly" />
      <PillButton
        label="Save"
        style={styles.save}
        disabled={name.trim().length === 0}
        onPress={() => {
          close();
          addMed({ petId, name: name.trim(), dose: dose.trim() || null, schedule: schedule.trim() || null, active: true }).catch(() => undefined);
        }}
      />
    </SheetScreen>
  );
}

/** Body of `/pet/[id]/add/[record]`, a native form sheet. */
export function AddRecordForm({ petId, kind }: { petId: string; kind: AddKind }) {
  return kind === "vaccination" ? <VaccinationForm petId={petId} /> : kind === "vet" ? <VetVisitForm petId={petId} /> : <MedForm petId={petId} />;
}

const styles = StyleSheet.create({
  save: { marginTop: layout.headerGap },
});
