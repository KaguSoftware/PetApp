import { useState } from "react";
import { Keyboard, View } from "react-native";
import { addMed, useLogs, useMeds, type Pet } from "@/data";
import { Chip, Field, formStyles, SavePill, TimeStepper, tsFromMinAgo } from "./parts";
import { saveCare } from "./save";

const ADD = "add";

/** Pick a medication (the last one given is preselected) or add a new one inline, then the time. */
export function MedsForm({ pet, onDone }: { pet: Pet; onDone: () => void }) {
  const meds = useMeds(pet.id);
  const logs = useLogs({ petId: pet.id });
  const lastMedId = logs.find((l) => l.type === "meds" && l.medId)?.medId ?? null;

  // null = nothing chosen yet: fall back to the last-used (or only) medication.
  const [picked, setPicked] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [minAgo, setMinAgo] = useState(0);

  const fallback = meds.find((m) => m.id === lastMedId)?.id ?? meds[0]?.id ?? ADD;
  const choice = picked ?? fallback;
  const adding = choice === ADD || meds.length === 0;
  const chosen = meds.find((m) => m.id === choice);
  const valid = adding ? name.trim().length > 0 : !!chosen;

  const save = () => {
    if (!valid) return;
    Keyboard.dismiss();
    const ts = tsFromMinAgo(minAgo);
    if (chosen && !adding) {
      saveCare(pet, "meds", { medId: chosen.id, ts }, chosen.name);
    } else {
      const medName = name.trim();
      // The new med's id is only known once it is stored; the log follows straight after.
      addMed({ petId: pet.id, name: medName, dose: dose.trim() || null, schedule: null, active: true })
        .then((med) => {
          if (med?.id) saveCare(pet, "meds", { medId: med.id, ts }, medName);
        })
        .catch(() => undefined);
    }
    onDone();
  };

  return (
    <View style={formStyles.body}>
      <View style={formStyles.chips}>
        {meds.map((m) => (
          <Chip key={m.id} label={m.name} selected={!adding && choice === m.id} onPress={() => setPicked(m.id)} />
        ))}
        <Chip label="Add medication" selected={adding} onPress={() => setPicked(ADD)} />
      </View>
      {adding ? (
        <>
          <Field label="NAME" value={name} onChangeText={setName} placeholder="e.g. Apoquel" maxLength={120} />
          <Field label="DOSE (OPTIONAL)" value={dose} onChangeText={setDose} placeholder="e.g. 1 tablet daily" maxLength={120} />
        </>
      ) : null}
      <TimeStepper minAgo={minAgo} onChange={setMinAgo} />
      <SavePill onPress={save} disabled={!valid} />
    </View>
  );
}
