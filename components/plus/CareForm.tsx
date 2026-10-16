import { useState } from "react";
import { Keyboard, View } from "react-native";
import type { CareType, Pet } from "@/data";
import { Field, formStyles, PickerField, positive, SavePill, tsFromPicked } from "./parts";
import { saveCare, type LogExtra } from "./save";

/** Optional second field per care type. */
const AMOUNT: Partial<Record<CareType, { label: string; placeholder: string; key: "grams" | "durationMinutes" }>> = {
  fed: { label: "GRAMS (OPTIONAL)", placeholder: "e.g. 60", key: "grams" },
  walk: { label: "MINUTES (OPTIONAL)", placeholder: "e.g. 30", key: "durationMinutes" },
};

/** The "When" picker, now by default: untouched means "now" and the data layer stamps the time. */
export function useWhen() {
  const [when, setWhen] = useState(() => new Date());
  const [touched, setTouched] = useState(false);
  return {
    when,
    set: (d: Date) => {
      setWhen(d);
      setTouched(true);
    },
    ts: () => (touched ? tsFromPicked(when) : undefined),
  };
}

/** Food, Water, Walk, Litter and Grooming: a time, plus grams or minutes where it applies. Defaults make it one tap to save. */
export function CareForm({ pet, type, onDone }: { pet: Pet; type: CareType; onDone: () => void }) {
  const w = useWhen();
  const [amount, setAmount] = useState("");
  const field = AMOUNT[type];

  const save = () => {
    Keyboard.dismiss();
    const extra: LogExtra = { ts: w.ts() };
    if (field) extra[field.key] = positive(amount);
    saveCare(pet, type, extra);
    onDone();
  };

  return (
    <View style={formStyles.body}>
      <PickerField label="WHEN" mode="time" value={w.when} onChange={w.set} />
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
