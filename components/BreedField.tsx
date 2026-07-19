import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icons";
import { PressableScale, PRESS_SCALE_SMALL, TextField } from "@/components/ui";
import { SingleWheelPicker } from "@/components/WheelPicker";
import { breedWheelOptions, OTHER_BREED } from "@/lib/data";
import { colors, font, radius } from "@/lib/theme";

/**
 * Collapsed by default: a single tappable row showing the current breed, a
 * chevron that rotates to hint at the expand/collapse state. Tapping it
 * reveals the breed wheel (and, for "Other", a free-text field) inline;
 * tapping again collapses it back down.
 */
export default function BreedField({
  species,
  breed,
  customBreed,
  onChangeBreed,
  onChangeCustomBreed,
}: {
  species: "cat" | "dog";
  breed: string;
  customBreed: string;
  onChangeBreed: (b: string) => void;
  onChangeCustomBreed: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const isOtherBreed = breed === OTHER_BREED;

  // Landing on "Other" closes the wheel and hands off straight to the
  // custom-name field below, rather than leaving the wheel open on its last row.
  const handleChange = (b: string) => {
    onChangeBreed(b);
    if (b === OTHER_BREED) setOpen(false);
  };

  return (
    <View>
      <PressableScale scaleTo={PRESS_SCALE_SMALL} onPress={() => setOpen((o) => !o)}>
        <View style={styles.row}>
          <Text style={styles.value}>{breed}</Text>
          <View style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }}>
            <Icon name="chevron-right" size={16} color={colors.label3} />
          </View>
        </View>
      </PressableScale>

      {open ? (
        <View style={{ marginTop: 10 }}>
          <SingleWheelPicker values={breedWheelOptions(species)} value={breed} onChange={handleChange} />
        </View>
      ) : null}

      {isOtherBreed ? (
        <TextField
          value={customBreed}
          onChangeText={onChangeCustomBreed}
          placeholder="Type your pet's breed"
          autoCorrect={false}
          returnKeyType="done"
          style={{ marginTop: 10 }}
        />
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
