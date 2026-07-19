import { useState } from "react";
import { View } from "react-native";
import Sheet from "@/components/Sheet";
import WheelPicker from "@/components/WheelPicker";
import { AccentButton, FieldLabel, SheetFooter, SheetTitle, TextField } from "@/components/ui";

/** Small tap-to-edit sheet for a single numeric pet stat (weight or age). */
export default function EditStatSheet({
  open,
  onClose,
  title,
  label,
  initialValue,
  onSave,
  min,
  max,
  unit,
  decimalPlaces = 1,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  label: string;
  initialValue: number | undefined;
  onSave: (value: number) => void;
  /** When min & max are given, the sheet shows an iOS clock-style wheel picker
   *  with a whole-number column and a separate decimal column. */
  min?: number;
  max?: number;
  unit?: string;
  decimalPlaces?: number;
}) {
  const wheel = min != null && max != null;
  const scale = 10 ** decimalPlaces;

  const clampSnap = (v: number) => {
    if (!wheel) return v;
    const c = Math.min(max!, Math.max(min!, v));
    return Math.round(c * scale) / scale;
  };

  const [value, setValue] = useState(initialValue != null ? String(initialValue) : "");
  const [wheelValue, setWheelValue] = useState<number>(clampSnap(initialValue ?? min ?? 0));

  // Re-sync whenever the sheet opens (or its target changes while open) —
  // adjusting state during render avoids the extra pass a useEffect would add.
  const [synced, setSynced] = useState({ open, initialValue });
  if (open && (synced.open !== open || synced.initialValue !== initialValue)) {
    setSynced({ open, initialValue });
    setValue(initialValue != null ? String(initialValue) : "");
    setWheelValue(clampSnap(initialValue ?? min ?? 0));
  } else if (!open && synced.open !== open) {
    setSynced({ open, initialValue });
  }

  const parsed = Number(value);
  const valid = wheel ? Number.isFinite(wheelValue) && wheelValue > 0 : value.trim() !== "" && Number.isFinite(parsed) && parsed > 0;

  const save = () => {
    if (!valid) return;
    onSave(wheel ? wheelValue : parsed);
    onClose();
  };

  // Whole-number column (min..max) + decimal column (0..9 for one place, etc.).
  const wholeValues: number[] = [];
  if (wheel) for (let v = Math.floor(min!); v <= Math.floor(max!); v++) wholeValues.push(v);
  const decimalValues: number[] = [];
  for (let d = 0; d < scale; d++) decimalValues.push(d);

  return (
    // scrollable={false} while a wheel is up: WheelPicker's columns are
    // ScrollViews, and nesting them in the sheet's own vertical ScrollView makes
    // both answer the same pan — on iOS the outer one usually wins and the wheel
    // won't turn. Wheel content is short enough not to need outer scrolling.
    <Sheet open={open} onClose={onClose} scrollable={!wheel}>
      <SheetTitle>{title}</SheetTitle>

      <FieldLabel>{label}</FieldLabel>
      {wheel ? (
        <View style={{ marginTop: 4 }}>
          <WheelPicker
            whole={wholeValues}
            decimals={decimalValues}
            value={wheelValue}
            onChange={setWheelValue}
            unit={unit}
            decimalPlaces={decimalPlaces}
          />
        </View>
      ) : (
        <TextField
          keyboardType="decimal-pad"
          inputMode="decimal"
          value={value}
          onChangeText={setValue}
          returnKeyType="done"
          onSubmitEditing={save}
        />
      )}

      <SheetFooter>
        <AccentButton disabled={!valid} onPress={save}>
          Save
        </AccentButton>
      </SheetFooter>
    </Sheet>
  );
}
