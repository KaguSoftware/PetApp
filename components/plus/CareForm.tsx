import { useState } from "react";
import { Keyboard, View } from "react-native";
import type { CareType, Pet } from "@/data";
import { Field, formStyles, positive, SavePill, TimeStepper, tsFromMinAgo } from "./parts";
import { saveCare, type LogExtra } from "./save";

/** Optional second field per care type. */
const AMOUNT: Partial<Record<CareType, { label: string; placeholder: string; key: "grams" | "durationMinutes" }>> = {
  fed: { label: "GRAMS (OPTIONAL)", placeholder: "e.g. 60", key: "grams" },
  walk: { label: "MINUTES (OPTIONAL)", placeholder: "e.g. 30", key: "durationMinutes" },
};

/** Food, Water, Walk, Litter and Grooming: a time, plus grams or minutes where it applies. Defaults make it one tap to save. */
export function CareForm({ pet, type, onDone }: { pet: Pet; type: CareType; onDone: () => void }) {
  const [minAgo, setMinAgo] = useState(0);
  const [amount, setAmount] = useState("");
  const field = AMOUNT[type];

  const save = () => {
    Keyboard.dismiss();
    const extra: LogExtra = { ts: tsFromMinAgo(minAgo) };
    if (field) extra[field.key] = positive(amount);
    saveCare(pet, type, extra);
    onDone();
  };

  return (
    <View style={formStyles.body}>
      <TimeStepper minAgo={minAgo} onChange={setMinAgo} />
      {field ? (
        <Field
          label={field.label}
          value={amount}
          onChangeText={setAmount}
          placeholder={field.placeholder}
          keyboardType="number-pad"
          maxLength={5}
          accessibilityLabel={type === "fed" ? "Grams" : "Minutes"}
        />
      ) : null}
      <SavePill onPress={save} />
    </View>
  );
}
