import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { isValidDateString, toDateString } from "@/lib/format";
import { Chip, TextField, Text, spacing } from "@/ui";

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

/** Types digits and inserts the dashes: 20210418 -> 2021-04-18. */
function formatBirthDate(text: string): string {
  const d = text.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
}

interface Props {
  petName: string;
  value: PetDetails;
  onChange: (d: PetDetails) => void;
}

/** Collapsed, skippable extras: birthday, breed, gender. */
export function PetDetailsFields({ petName, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const error = birthDateError(value.birthDate);

  if (!open) {
    return (
      <View style={styles.center}>
        <Chip label={`Add more about ${petName} (optional)`} icon="plus" onPress={() => setOpen(true)} />
      </View>
    );
  }
  return (
    <View style={styles.wrap}>
      <TextField
        label="Birthday"
        placeholder="YYYY-MM-DD"
        value={value.birthDate}
        onChangeText={(t) => onChange({ ...value, birthDate: formatBirthDate(t) })}
        keyboardType="number-pad"
        maxLength={10}
      />
      {error ? (
        <Text variant="small" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <TextField
        label="Breed"
        placeholder="e.g. Golden Retriever"
        value={value.breed}
        onChangeText={(t) => onChange({ ...value, breed: t })}
        autoCapitalize="words"
        maxLength={40}
      />
      <View style={styles.genders}>
        {(["male", "female"] as const).map((g) => (
          <Chip
            key={g}
            label={g === "male" ? "Boy" : "Girl"}
            selected={value.gender === g}
            onPress={() => onChange({ ...value, gender: value.gender === g ? null : g })}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  wrap: { gap: spacing.md },
  genders: { flexDirection: "row", gap: spacing.sm },
});
