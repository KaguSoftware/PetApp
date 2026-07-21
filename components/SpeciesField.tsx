import { Icon } from "@/components/Icons";
import { PRESS_SCALE_SMALL, PressableScale } from "@/components/ui";
import { SingleWheelPicker } from "@/components/WheelPicker";
import { colors, font, radius } from "@/lib/theme";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

const SPECIES_LABELS: Record<"cat" | "dog", string> = { cat: "Cat", dog: "Dog" };
const SPECIES_VALUES: Record<string, "cat" | "dog"> = { Cat: "cat", Dog: "dog" };

/**
 * Collapsed by default: a single tappable row showing the current species, a
 * chevron that rotates to hint at the expand/collapse state. Tapping it
 * reveals the species wheel inline; tapping again collapses it back down.
 * Mirrors BreedField's interaction so Species and Breed feel consistent.
 */
export default function SpeciesField({
  species,
  onChangeSpecies,
}: {
  species: "cat" | "dog";
  onChangeSpecies: (s: "cat" | "dog") => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <PressableScale scaleTo={PRESS_SCALE_SMALL} onPress={() => setOpen((o) => !o)}>
        <View style={styles.row}>
          <Text style={styles.value}>{SPECIES_LABELS[species]}</Text>
          <View style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }}>
            <Icon name="chevron-right" size={16} color={colors.label3} />
          </View>
        </View>
      </PressableScale>

      {open ? (
        <View style={{ marginTop: 10 }}>
          <SingleWheelPicker
            values={["Cat", "Dog"]}
            value={SPECIES_LABELS[species]}
            onChange={(v) => onChangeSpecies(SPECIES_VALUES[v])}
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
