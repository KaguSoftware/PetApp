import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icons";
import { PressableScale, PRESS_SCALE_SMALL } from "@/components/ui";
import { SingleWheelPicker } from "@/components/WheelPicker";
import { colors, font, radius } from "@/lib/theme";

/** Species the wheel offers, in display order. */
const SPECIES: { value: "cat" | "dog"; label: string }[] = [
  { value: "cat", label: "Cat" },
  { value: "dog", label: "Dog" },
];

const LABELS = SPECIES.map((s) => s.label);
const labelToValue = (label: string) => SPECIES.find((s) => s.label === label)?.value ?? "cat";
const valueToLabel = (value: "cat" | "dog") => SPECIES.find((s) => s.value === value)?.label ?? "Cat";

/**
 * Animal picker, styled to match BreedField: a collapsed row showing the
 * current species with a chevron that rotates on expand, revealing a single
 * wheel column inline. Swapped in for the old Segmented control so animal and
 * breed read as one consistent wheel-based pair.
 */
export default function SpeciesField({
  species,
  onChange,
}: {
  species: "cat" | "dog";
  onChange: (s: "cat" | "dog") => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <PressableScale scaleTo={PRESS_SCALE_SMALL} onPress={() => setOpen((o) => !o)}>
        <View style={styles.row}>
          <Text style={styles.value}>{valueToLabel(species)}</Text>
          <View style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }}>
            <Icon name="chevron-right" size={16} color={colors.label3} />
          </View>
        </View>
      </PressableScale>

      {open ? (
        <View style={{ marginTop: 10 }}>
          <SingleWheelPicker
            values={LABELS}
            value={valueToLabel(species)}
            onChange={(label) => onChange(labelToValue(label))}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  value: { fontSize: 16, fontFamily: font.medium, color: colors.label },
});
