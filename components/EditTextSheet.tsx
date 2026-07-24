import { useState } from "react";
import Sheet from "@/components/Sheet";
import { AccentButton, FieldLabel, SheetFooter, SheetTitle, TextField } from "@/components/ui";

/** Small tap-to-edit sheet for a single free-text pet field (e.g. a care
 *  activity's frequency). Mirrors EditStatSheet, but the value is a string. */
export default function EditTextSheet({
  open,
  onClose,
  title,
  label,
  placeholder,
  initialValue,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  label: string;
  placeholder?: string;
  initialValue: string | undefined;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue ?? "");
  // Re-sync the input whenever the sheet opens (or its target value changes
  // while open) — adjusting state during render instead of an effect avoids
  // the extra render pass a `useEffect` + `setState` would trigger.
  const [synced, setSynced] = useState({ open, initialValue });
  if (open && (synced.open !== open || synced.initialValue !== initialValue)) {
    setSynced({ open, initialValue });
    setValue(initialValue ?? "");
  } else if (!open && synced.open !== open) {
    setSynced({ open, initialValue });
  }

  const valid = value.trim() !== "";

  const save = () => {
    if (!valid) return;
    onSave(value.trim());
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetTitle>{title}</SheetTitle>

      <FieldLabel>{label}</FieldLabel>
      <TextField value={value} onChangeText={setValue} placeholder={placeholder} returnKeyType="done" onSubmitEditing={save} />

      <SheetFooter>
        <AccentButton disabled={!valid} onPress={save}>
          Save
        </AccentButton>
      </SheetFooter>
    </Sheet>
  );
}
