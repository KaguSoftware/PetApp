import { useState } from "react";
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
  step = 1,
  unit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  label: string;
  initialValue: number | undefined;
  onSave: (value: number) => void;
  /** When min & max are given, the sheet shows an iOS clock-style wheel picker. */
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}) {
  const wheel = min != null && max != null;

  // Rounds a value to the picker's step grid so it lands on a real row.
  const snap = (v: number) => {
    if (!wheel) return v;
    const clamped = Math.min(max!, Math.max(min!, v));
    return Math.round((clamped - min!) / step) * step + min!;
  };

  const [value, setValue] = useState(initialValue != null ? String(initialValue) : "");
  const [wheelValue, setWheelValue] = useState<number>(snap(initialValue ?? min ?? 0));

  // Re-sync whenever the sheet opens (or its target changes while open) —
  // adjusting state during render avoids the extra pass a useEffect would add.
  const [synced, setSynced] = useState({ open, initialValue });
  if (open && (synced.open !== open || synced.initialValue !== initialValue)) {
    setSynced({ open, initialValue });
    setValue(initialValue != null ? String(initialValue) : "");
    setWheelValue(snap(initialValue ?? min ?? 0));
  } else if (!open && synced.open !== open) {
    setSynced({ open, initialValue });
  }

  const parsed = Number(value);
  const valid = wheel ? Number.isFinite(wheelValue) : value.trim() !== "" && Number.isFinite(parsed) && parsed > 0;

  const save = () => {
    if (!valid) return;
    onSave(wheel ? wheelValue : parsed);
    onClose();
  };

  // Build the discrete option list for the wheel (rounded to avoid FP drift).
  const decimals = step < 1 ? String(step).split(".")[1]?.length ?? 1 : 0;
  const values: number[] = [];
  if (wheel) {
    for (let v = min!; v <= max! + 1e-9; v += step) values.push(Number(v.toFixed(decimals)));
  }
  const fmt = (v: number) => `${v.toFixed(decimals)}${unit ? ` ${unit}` : ""}`;

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetTitle>{title}</SheetTitle>

      <FieldLabel>{label}</FieldLabel>
      {wheel ? (
        <WheelPicker values={values} value={wheelValue} onChange={setWheelValue} format={fmt} width={200} />
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
