import { useState } from "react";
import Sheet from "@/components/Sheet";
import { AccentButton, FieldLabel, SheetFooter, SheetTitle, TextField } from "@/components/ui";

/** Small tap-to-edit sheet for a single numeric pet stat (weight or age). */
export default function EditStatSheet({
  open,
  onClose,
  title,
  label,
  initialValue,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  label: string;
  initialValue: number | undefined;
  onSave: (value: number) => void;
}) {
  const [value, setValue] = useState(initialValue != null ? String(initialValue) : "");
  // Re-sync the input whenever the sheet opens (or its target value changes
  // while open) — adjusting state during render instead of an effect avoids
  // the extra render pass a `useEffect` + `setState` would trigger.
  const [synced, setSynced] = useState({ open, initialValue });
  if (open && (synced.open !== open || synced.initialValue !== initialValue)) {
    setSynced({ open, initialValue });
    setValue(initialValue != null ? String(initialValue) : "");
  } else if (!open && synced.open !== open) {
    setSynced({ open, initialValue });
  }

  const parsed = Number(value);
  const valid = value.trim() !== "" && Number.isFinite(parsed) && parsed > 0;

  const save = () => {
    if (!valid) return;
    onSave(parsed);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetTitle>{title}</SheetTitle>

      <FieldLabel>{label}</FieldLabel>
      <TextField
        keyboardType="decimal-pad"
        inputMode="decimal"
        value={value}
        onChangeText={setValue}
        returnKeyType="done"
        onSubmitEditing={save}
      />

      <SheetFooter>
        <AccentButton disabled={!valid} onPress={save}>
          Save
        </AccentButton>
      </SheetFooter>
    </Sheet>
  );
}
