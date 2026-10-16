import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { isValidDateString, toDateString } from "@/lib/format";
import { DateField, layout, MenuRow, PillButton, TextField } from "@/ui";

export interface PetDetails {
  birthDate: string;
  breed: string;
  gender: "male" | "female" | null;
}

export const EMPTY_DETAILS: PetDetails = { birthDate: "", breed: "", gender: null };

/** Empty is fine (skippable); otherwise it must be a real date that is not in the future. */
export function birthDateError(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (!isValidDateString(v)) return "Use the format YYYY-MM-DD, like 2021-04-18.";
  if (v > toDateString(Date.now())) return "That date is in the future.";
  return null;
}

interface Props {
  petName: string;
  value: PetDetails;
  onChange: (d: PetDetails) => void;
}

type Gender = "male" | "female" | "none";

/** Collapsed, skippable extras: birthday (native date picker), breed, gender (native menu). */
export function PetDetailsFields({ petName, value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <View style={styles.center}>
        <PillButton label={`Add more about ${petName} (optional)`} icon="plus" variant="secondary" fullWidth={false} onPress={() => setOpen(true)} />
      </View>
    );
  }
  return (
    <View style={styles.wrap}>
      <DateField label="Birthday" value={value.birthDate} onChange={(birthDate) => onChange({ ...value, birthDate })} optional maximumDate={new Date()} />
      <TextField
        label="Breed"
        placeholder="e.g. Golden Retriever"
        value={value.breed}
        onChangeText={(t) => onChange({ ...value, breed: t })}
        autoCapitalize="words"
        maxLength={40}
      />
      <MenuRow<Gender>
        label="Gender"
        selected={value.gender ?? "none"}
        onSelect={(g) => onChange({ ...value, gender: g === "none" ? null : g })}
        options={[
          { value: "male", label: "Boy" },
          { value: "female", label: "Girl" },
          { value: "none", label: "Not set" },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  wrap: { gap: layout.item },
});
