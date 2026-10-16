import { useState } from "react";
import { Keyboard, ScrollView, StyleSheet, View } from "react-native";
import { addNote, showToast, type Pet, type PetNote } from "@/data";
import { Chip, PillButton, TextField, haptic, spacing } from "@/ui";
import { StepHeader } from "./StepHeader";

export function NoteStep({ pet, onBack, onDone }: { pet: Pet; onBack: () => void; onDone: () => void }) {
  const [kind, setKind] = useState<PetNote["kind"]>("note");
  const [body, setBody] = useState("");
  const empty = body.trim().length === 0;

  const save = () => {
    if (empty) return;
    Keyboard.dismiss();
    haptic("success");
    addNote(pet.id, kind, body.trim())
      .then(() => showToast({ kind: "info", text: kind === "symptom" ? "Symptom saved ✓" : "Note saved ✓" }))
      .catch(() => undefined);
    onDone();
  };

  return (
    <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <StepHeader title={`Note for ${pet.name}`} onBack={onBack} />
      <View style={styles.chips}>
        <Chip label="Note" icon="note" selected={kind === "note"} onPress={() => setKind("note")} />
        <Chip label="Symptom" icon="health" selected={kind === "symptom"} onPress={() => setKind("symptom")} />
      </View>
      <TextField
        value={body}
        onChangeText={setBody}
        multiline
        placeholder={kind === "symptom" ? "What did you notice?" : "Anything worth remembering?"}
        accessibilityLabel="Note text"
        maxLength={1000}
      />
      <PillButton label="Save" icon="check" size="lg" disabled={empty} onPress={save} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingBottom: spacing.sm },
  chips: { flexDirection: "row", gap: spacing.sm },
});
