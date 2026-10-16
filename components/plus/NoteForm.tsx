import { useState } from "react";
import { Keyboard, View } from "react-native";
import type { Pet, PetNote } from "@/data";
import { Chip, Field, formStyles, SavePill } from "./parts";
import { saveNote } from "./save";

const MAX_NOTE_LENGTH = 4000;

export function NoteForm({ pet, onDone }: { pet: Pet; onDone: () => void }) {
  const [kind, setKind] = useState<PetNote["kind"]>("note");
  const [body, setBody] = useState("");
  const trimmed = body.trim();
  const valid = trimmed.length > 0 && trimmed.length <= MAX_NOTE_LENGTH;

  const save = () => {
    if (!valid) return;
    Keyboard.dismiss();
    saveNote(pet, kind, trimmed);
    onDone();
  };

  return (
    <View style={formStyles.body}>
      <View style={formStyles.chips}>
        <Chip label="Note" selected={kind === "note"} onPress={() => setKind("note")} />
        <Chip label="Symptom" selected={kind === "symptom"} onPress={() => setKind("symptom")} />
      </View>
      <Field
        label={kind === "symptom" ? "WHAT DID YOU NOTICE?" : "NOTE"}
        value={body}
        onChangeText={setBody}
        multiline
        maxLength={MAX_NOTE_LENGTH}
        placeholder={kind === "symptom" ? "Describe the symptom" : "Anything worth remembering?"}
        accessibilityLabel="Note text"
      />
      <SavePill onPress={save} disabled={!valid} />
    </View>
  );
}
