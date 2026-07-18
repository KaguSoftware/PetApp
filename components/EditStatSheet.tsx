import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import Sheet from "@/components/Sheet";
import { AccentButton } from "@/components/ui";
import { cardShadow, colors, font } from "@/lib/theme";

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

  return (
    <Sheet open={open} onClose={onClose}>
      <Text style={styles.title}>{title}</Text>

      <Text style={styles.label}>{label}</Text>
      <TextInput
        keyboardType="decimal-pad"
        inputMode="decimal"
        value={value}
        onChangeText={setValue}
        style={styles.input}
        placeholderTextColor={colors.label3}
      />

      <View style={styles.footer}>
        <AccentButton
          disabled={!valid}
          onPress={() => {
            onSave(parsed);
            onClose();
          }}
        >
          Save
        </AccentButton>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontFamily: font.bold, letterSpacing: -0.2, color: colors.label },
  label: {
    marginTop: 20,
    marginBottom: 6,
    fontSize: 13,
    fontFamily: font.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: colors.label2,
  },
  input: {
    borderRadius: 12,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: font.medium,
    color: colors.label,
    ...cardShadow,
  },
  footer: { marginTop: 28 },
});
