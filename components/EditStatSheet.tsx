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
  // The wheel can only produce in-range values (the columns below are built from
  // min/max), so anything it yields is valid. The TextField branch still needs
  // the > 0 guard since the user can type anything.
  const valid = wheel ? Number.isFinite(wheelValue) : value.trim() !== "" && Number.isFinite(parsed) && parsed > 0;

  const save = () => {
    if (!valid) return;
    onSave(wheel ? wheelValue : parsed);
    onClose();
  };

  // Whole-number column (min..max) + decimal column (0..9 for one place, etc.).
  //
  // Both columns are range-aware so the wheel can't land outside [min, max].
  // Previously the whole column started at floor(min) — with min=0.1 that put a
  // selectable 0 on the wheel, and picking 0 with decimal 0 produced 0.0, which
  // failed the > 0 check and greyed out Save with nothing explaining why.
  const wholeValues: number[] = [];
  // `|| 0` normalizes the -0 that Math.ceil(0 - 1e-9) returns — it would render
  // as a literal "-0" row on the wheel.
  if (wheel) for (let v = Math.ceil(min! - 1e-9) || 0; v <= Math.floor(max!); v++) wholeValues.push(v);
  // Guarantee at least one row when min and max share no whole number between
  // them (e.g. min 0.1, max 0.9 → ceil(0.1)=1 > floor(0.9)=0).
  if (wheel && wholeValues.length === 0) wholeValues.push(Math.floor(min!));

  const wholeSelected = Math.floor(wheelValue + 1e-9);
  const decimalValues: number[] = [];
  for (let d = 0; d < scale; d++) {
    if (wheel) {
      const candidate = wholeSelected + d / scale;
      // Trim decimals that would push the value past either bound — at the
      // boundary whole number only the reachable decimals are offered.
      if (candidate < min! - 1e-9 || candidate > max! + 1e-9) continue;
    }
    decimalValues.push(d);
  }
  if (decimalValues.length === 0) decimalValues.push(0);

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
