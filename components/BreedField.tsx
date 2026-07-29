import { useMemo, useState } from "react";
import { Keyboard, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icons";
import Sheet from "@/components/Sheet";
import { AccentButton, FieldLabel, PressableScale, PRESS_SCALE_SMALL, SheetFooter, SheetTitle, TextField } from "@/components/ui";
import { SingleWheelPicker } from "@/components/WheelPicker";
import { breedWheelOptions, OTHER_BREED } from "@/lib/data";
import { font, radius, useColors, type Colors } from "@/lib/theme";

/**
 * A single tappable row showing the current breed. `presentation` picks how the
 * wheel is revealed:
 *   - "sheet"  → a bottom sheet slides up with the wheel (plus the custom-name
 *                field when "Other" is selected) and a Save button. Draft state
 *                is local, so dismissing the sheet leaves the field untouched.
 *   - "inline" → the wheel expands underneath the row (the default; required
 *                when this field is itself already rendered inside a Sheet,
 *                since nesting Modals is unreliable on iOS).
 */
export default function BreedField({
  species,
  breed,
  customBreed,
  onChangeBreed,
  onChangeCustomBreed,
  presentation = "inline",
}: {
  species: "cat" | "dog";
  breed: string;
  customBreed: string;
  onChangeBreed: (b: string) => void;
  onChangeCustomBreed: (v: string) => void;
  presentation?: "inline" | "sheet";
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const isOtherBreed = breed === OTHER_BREED;

  // Only meaningful in "sheet" mode: the wheel + text field edit these until
  // Save commits them upward.
  const [draftBreed, setDraftBreed] = useState(breed);
  const [draftCustom, setDraftCustom] = useState(customBreed);
  const draftIsOther = draftBreed === OTHER_BREED;

  // Landing on "Other" closes the wheel and hands off straight to the
  // custom-name field below, rather than leaving the wheel open on its last row.
  const handleChange = (b: string) => {
    onChangeBreed(b);
    if (b === OTHER_BREED) setOpen(false);
  };

  const openSheet = () => {
    // Release first responder BEFORE the sheet's Modal mounts. Without this the
    // Modal steals focus while the text field keeps it, so iOS restores that
    // field when the Modal unmounts and the keyboard snaps back with no
    // animation. Dismissing here makes it animate out and stay out.
    Keyboard.dismiss();
    setDraftBreed(breed);
    setDraftCustom(customBreed);
    setOpen(true);
  };

  // Every close path goes through here: the "Other" text field lives INSIDE the
  // sheet, so unmounting the Modal while it still holds focus reproduces the
  // same no-animation keyboard flash on the way back out.
  const closeSheet = () => {
    Keyboard.dismiss();
    setOpen(false);
  };

  const save = () => {
    onChangeBreed(draftBreed);
    onChangeCustomBreed(draftIsOther ? draftCustom : "");
    closeSheet();
  };

  // The row shows the typed custom name once there is one — "Other" on its own
  // tells the user nothing about which breed they actually entered.
  const rowLabel = isOtherBreed && customBreed.trim() ? customBreed.trim() : breed;

  return (
    <View>
      <PressableScale
        scaleTo={PRESS_SCALE_SMALL}
        onPress={presentation === "sheet" ? openSheet : () => setOpen((o) => !o)}
      >
        <View style={styles.row}>
          <Text style={styles.value}>{rowLabel}</Text>
          <View style={{ transform: [{ rotate: open && presentation === "inline" ? "90deg" : "0deg" }] }}>
            <Icon name="chevron-right" size={16} color={colors.label3} />
          </View>
        </View>
      </PressableScale>

      {presentation === "inline" ? (
        <>
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
        </>
      ) : (
        // scrollable={false}: the wheel's columns are ScrollViews, and nesting
        // them in the sheet's own vertical ScrollView means both answer the same
        // pan — on iOS the outer one wins and the wheel won't turn.
        <Sheet open={open} onClose={closeSheet} scrollable={false}>
          <SheetTitle>Breed</SheetTitle>
          <FieldLabel>BREED</FieldLabel>
          <SingleWheelPicker values={breedWheelOptions(species)} value={draftBreed} onChange={setDraftBreed} />

          {draftIsOther ? (
            <TextField
              value={draftCustom}
              onChangeText={setDraftCustom}
              placeholder="Type your pet's breed"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={save}
              style={{ marginTop: 10 }}
            />
          ) : null}

          <SheetFooter>
            <AccentButton onPress={save}>Save</AccentButton>
          </SheetFooter>
        </Sheet>
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
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
