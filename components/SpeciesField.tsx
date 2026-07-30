import { Icon } from "@/components/Icons";
import Sheet from "@/components/Sheet";
import { AccentButton, PRESS_SCALE_SMALL, PressableScale, SheetFooter, SheetTitle } from "@/components/ui";
import { SingleWheelPicker } from "@/components/WheelPicker";
import { font, radius, useColors, type Colors } from "@/lib/theme";
import { useMemo, useState } from "react";
import { Keyboard, StyleSheet, Text, View } from "react-native";

const SPECIES_LABELS: Record<"cat" | "dog", string> = { cat: "Cat", dog: "Dog" };
const SPECIES_VALUES: Record<string, "cat" | "dog"> = { Cat: "cat", Dog: "dog" };

/**
 * A single tappable row showing the current species. `presentation` picks how
 * the wheel is revealed:
 *   - "sheet"  → a bottom sheet slides up with the wheel + a Save button, the
 *                same shape as EditStatSheet. Draft state is local, so backing
 *                out of the sheet leaves the field untouched.
 *   - "inline" → the wheel expands underneath the row (the default; required
 *                when this field is itself already rendered inside a Sheet,
 *                since nesting Modals is unreliable on iOS).
 * Mirrors BreedField's interaction so Species and Breed feel consistent.
 */
export default function SpeciesField({
  species,
  onChangeSpecies,
  presentation = "inline",
}: {
  species: "cat" | "dog";
  onChangeSpecies: (s: "cat" | "dog") => void;
  presentation?: "inline" | "sheet";
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  // Only meaningful in "sheet" mode: the wheel edits this until Save commits.
  const [draft, setDraft] = useState<"cat" | "dog">(species);

  const openSheet = () => {
    // Release first responder BEFORE the sheet's Modal mounts. Without this the
    // Modal steals focus while the text field keeps it, so iOS restores that
    // field when the Modal unmounts and the keyboard snaps back with no
    // animation. Dismissing here makes it animate out and stay out.
    Keyboard.dismiss();
    setDraft(species);
    setOpen(true);
  };

  const save = () => {
    onChangeSpecies(draft);
    setOpen(false);
  };

  return (
    <View>
      <PressableScale
        scaleTo={PRESS_SCALE_SMALL}
        onPress={presentation === "sheet" ? openSheet : () => setOpen((o) => !o)}
      >
        <View style={styles.row}>
          <Text style={styles.value}>{SPECIES_LABELS[species]}</Text>
          <View style={{ transform: [{ rotate: open && presentation === "inline" ? "90deg" : "0deg" }] }}>
            <Icon name="chevron-right" size={16} color={colors.label3} />
          </View>
        </View>
      </PressableScale>

      {presentation === "inline" ? (
        open ? (
          <View style={{ marginTop: 10 }}>
            <SingleWheelPicker
              values={["Cat", "Dog"]}
              value={SPECIES_LABELS[species]}
              onChange={(v) => onChangeSpecies(SPECIES_VALUES[v])}
            />
          </View>
        ) : null
      ) : (
        // scrollable={false}: the wheel's columns are ScrollViews, and nesting
        // them in the sheet's own vertical ScrollView means both answer the same
        // pan — on iOS the outer one wins and the wheel won't turn.
        <Sheet open={open} onClose={() => setOpen(false)} scrollable={false}>
          <SheetTitle>Species</SheetTitle>
          {/* SheetTitle has no bottom margin — the removed FieldLabel used to
              supply this gap, so the wheel needs its own. */}
          <View style={{ marginTop: 18 }}>
            <SingleWheelPicker
              values={["Cat", "Dog"]}
              value={SPECIES_LABELS[draft]}
              onChange={(v) => setDraft(SPECIES_VALUES[v])}
            />
          </View>
          <SheetFooter>
            <AccentButton onPress={save}>Save</AccentButton>
          </SheetFooter>
        </Sheet>
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
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
