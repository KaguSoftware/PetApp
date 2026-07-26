import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import BreedField from "@/components/BreedField";
import Sheet from "@/components/Sheet";
import SpeciesField from "@/components/SpeciesField";
import { AccentButton, FieldLabel, Segmented, SheetFooter, SheetTitle, TextField } from "@/components/ui";
import { BREEDS_BY_SPECIES, kgToUnit, OTHER_BREED, unitToKg, weightUnitLabel } from "@/lib/data";
import { useStore } from "@/lib/store";
import { font, useColors, type Colors } from "@/lib/theme";

/* Sensible starting weight (kg) / cup size (g) per species for the prefilled inputs. */
const SPECIES_DEFAULTS: Record<"cat" | "dog", { weightKg: number; cupGrams: number }> = {
  cat: { weightKg: 4, cupGrams: 60 },
  dog: { weightKg: 20, cupGrams: 120 },
};

/**
 * The one add-a-pet form, shared by the Pets tab and the onboarding
 * first-pet step. Owns its own form state and resets it every time it opens.
 */
export default function AddPetSheet({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  /** Called after the pet is committed to the store (onboarding advances on this). */
  onAdded?: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { state, addPet } = useStore();
  const [petName, setPetName] = useState("");
  const [species, setSpecies] = useState<"cat" | "dog">("cat");
  const [breed, setBreed] = useState(BREEDS_BY_SPECIES.cat[0]);
  const [customBreed, setCustomBreed] = useState("");
  // Tri-state to match the pet-profile and family editors — "unset" is a real
  // answer (it just costs the gender-specific weight/feeding guide).
  const [gender, setGender] = useState<"female" | "male" | "unset">("unset");
  const [ageInput, setAgeInput] = useState("1");
  const [weightInput, setWeightInput] = useState("");
  const [cupInput, setCupInput] = useState("");

  // Prefill the weight/cup inputs from the species defaults (weight shown in
  // the household's unit) so the sheet opens with reasonable numbers to tweak.
  const prefillFor = (sp: "cat" | "dog") => {
    const d = SPECIES_DEFAULTS[sp];
    setWeightInput(String(Math.round(kgToUnit(d.weightKg, state.units) * 10) / 10));
    setCupInput(String(d.cupGrams));
  };

  useEffect(() => {
    if (!open) return;
    setSpecies("cat");
    setBreed(BREEDS_BY_SPECIES.cat[0]);
    setCustomBreed("");
    setGender("unset");
    setAgeInput("1");
    setPetName("");
    const d = SPECIES_DEFAULTS.cat;
    setWeightInput(String(Math.round(kgToUnit(d.weightKg, state.units) * 10) / 10));
    setCupInput(String(d.cupGrams));
    // Reset belongs to the moment of opening only — units changing mid-open
    // shouldn't wipe what the user typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // A picklist match is saved under its canonical name so it picks up the
  // vet-built CARE_PLANS entry; "Other" falls back to the typed custom name,
  // or a species default if that's left blank.
  const isOtherBreed = breed === OTHER_BREED;
  const resolvedBreed = isOtherBreed ? customBreed.trim() || (species === "cat" ? "House cat" : "Mixed breed") : breed;
  const parsedAge = Number(ageInput);
  const parsedWeightUnit = Number(weightInput);
  const parsedCup = Number(cupInput);
  const valid =
    petName.trim().length > 0 &&
    Number.isFinite(parsedAge) &&
    parsedAge >= 0 &&
    Number.isFinite(parsedWeightUnit) &&
    parsedWeightUnit > 0 &&
    Number.isFinite(parsedCup) &&
    parsedCup > 0;

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetTitle>Add a pet</SheetTitle>

      <FieldLabel>Name</FieldLabel>
      <TextField value={petName} onChangeText={setPetName} placeholder="e.g. Mochi" returnKeyType="done" />

      <FieldLabel>Species</FieldLabel>
      <SpeciesField
        species={species}
        onChangeSpecies={(s) => {
          setSpecies(s);
          setBreed(BREEDS_BY_SPECIES[s][0]);
          setCustomBreed("");
          prefillFor(s);
        }}
      />

      <FieldLabel>Breed</FieldLabel>
      <BreedField species={species} breed={breed} customBreed={customBreed} onChangeBreed={setBreed} onChangeCustomBreed={setCustomBreed} />
      <Text style={styles.breedHint}>
        {isOtherBreed
          ? "Not on the list — you'll set custom feeding/water/care targets on the Care tab."
          : "This breed has a vet-built care plan."}
      </Text>

      <FieldLabel>Gender</FieldLabel>
      <Segmented
        options={[
          { value: "male", label: "Male" },
          { value: "female", label: "Female" },
          { value: "unset", label: "Not set" },
        ]}
        value={gender}
        onChange={setGender}
      />

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <FieldLabel>Age (years)</FieldLabel>
          <TextField value={ageInput} onChangeText={setAgeInput} keyboardType="decimal-pad" returnKeyType="done" placeholder="1" />
        </View>
        <View style={{ flex: 1 }}>
          <FieldLabel>{`Weight (${weightUnitLabel(state.units)})`}</FieldLabel>
          <TextField value={weightInput} onChangeText={setWeightInput} keyboardType="decimal-pad" returnKeyType="done" placeholder="0" />
        </View>
      </View>

      <FieldLabel>Cup size (grams of food per cup)</FieldLabel>
      <TextField value={cupInput} onChangeText={setCupInput} keyboardType="number-pad" returnKeyType="done" placeholder="60" />

      <SheetFooter>
        <AccentButton
          disabled={!valid}
          onPress={() => {
            addPet({
              name: petName.trim(),
              species,
              breed: resolvedBreed,
              gender: gender === "unset" ? undefined : gender,
              ageYears: parsedAge,
              weightKg: unitToKg(parsedWeightUnit, state.units),
              cupGrams: Math.round(parsedCup),
            });
            onClose();
            onAdded?.();
          }}
        >
          Add to family
        </AccentButton>
      </SheetFooter>
    </Sheet>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    breedHint: { fontSize: 12.5, fontFamily: font.regular, color: colors.label3, marginTop: 6, lineHeight: 17 },
  });
