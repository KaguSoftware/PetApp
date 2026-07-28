import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import BreedField from "@/components/BreedField";
import { PushedScreen } from "@/components/Screen";
import SpeciesField from "@/components/SpeciesField";
import { AccentButton, FieldLabel, Segmented, TextField } from "@/components/ui";
import { BREEDS_BY_SPECIES, cmToUnit, kgToUnit, lengthUnitLabel, OTHER_BREED, unitToCm, unitToKg, weightUnitLabel } from "@/lib/data";
import { useStore } from "@/lib/store";
import { font, useColors, type Colors } from "@/lib/theme";

/** Strips anything but digits and a single decimal point — no letters, no
 *  minus sign — for the height/length inputs, which have no keyboard-level
 *  way to block a pasted "-5" or "5cm" the way a numeric wheel would. */
function sanitizeMeasurement(text: string): string {
  const cleaned = text.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
}

/* Sensible starting weight (kg) / cup size (g) / height & length (cm) per species for the prefilled inputs. */
const SPECIES_DEFAULTS: Record<"cat" | "dog", { weightKg: number; cupGrams: number; heightCm: number; lengthCm: number }> = {
  cat: { weightKg: 4, cupGrams: 60, heightCm: 25, lengthCm: 46 },
  dog: { weightKg: 20, cupGrams: 120, heightCm: 55, lengthCm: 90 },
};

/**
 * The one add-a-pet form, shared by the Pets tab and the onboarding
 * first-pet step (via `?onboarding=1`, which advances onboarding on success
 * instead of just going back).
 */
export default function AddPetPage() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const { state, addPet } = useStore();
  const [petName, setPetName] = useState("");
  const [species, setSpecies] = useState<"cat" | "dog">("cat");
  const [breed, setBreed] = useState(BREEDS_BY_SPECIES.cat[0]);
  const [customBreed, setCustomBreed] = useState("");
  // Tri-state to match the pet-profile and family editors — "unset" is a real
  // answer (it just costs the gender-specific weight/feeding guide).
  const [gender, setGender] = useState<"female" | "male" | "unset">("unset");
  const [ageInput, setAgeInput] = useState("1");
  const [weightInput, setWeightInput] = useState(() => String(Math.round(kgToUnit(SPECIES_DEFAULTS.cat.weightKg, state.units) * 10) / 10));
  const [cupInput, setCupInput] = useState(() => String(SPECIES_DEFAULTS.cat.cupGrams));
  // Body measurements are optional — left blank they're simply not sent.
  const [heightInput, setHeightInput] = useState(() => String(cmToUnit(SPECIES_DEFAULTS.cat.heightCm, state.units)));
  const [lengthInput, setLengthInput] = useState(() => String(cmToUnit(SPECIES_DEFAULTS.cat.lengthCm, state.units)));

  // Prefill the weight/cup/height/length inputs from the species defaults
  // (shown in the household's unit) so switching species offers reasonable
  // numbers to tweak.
  const prefillFor = (sp: "cat" | "dog") => {
    const d = SPECIES_DEFAULTS[sp];
    setWeightInput(String(Math.round(kgToUnit(d.weightKg, state.units) * 10) / 10));
    setCupInput(String(d.cupGrams));
    setHeightInput(String(cmToUnit(d.heightCm, state.units)));
    setLengthInput(String(cmToUnit(d.lengthCm, state.units)));
  };

  // A picklist match is saved under its canonical name so it picks up the
  // vet-built CARE_PLANS entry; "Other" falls back to the typed custom name,
  // or a species default if that's left blank.
  const isOtherBreed = breed === OTHER_BREED;
  const resolvedBreed = isOtherBreed ? customBreed.trim() || (species === "cat" ? "House cat" : "Mixed breed") : breed;
  const parsedAge = Number(ageInput);
  const parsedWeightUnit = Number(weightInput);
  const parsedCup = Number(cupInput);
  // Height/length are optional — blank is valid, but a present value must be
  // a real positive number so it doesn't silently save as NaN/0.
  const parsedHeightUnit = heightInput.trim() ? Number(heightInput) : undefined;
  const parsedLengthUnit = lengthInput.trim() ? Number(lengthInput) : undefined;
  const valid =
    petName.trim().length > 0 &&
    Number.isFinite(parsedAge) &&
    parsedAge >= 0 &&
    Number.isFinite(parsedWeightUnit) &&
    parsedWeightUnit > 0 &&
    Number.isFinite(parsedCup) &&
    parsedCup > 0 &&
    (parsedHeightUnit == null || (Number.isFinite(parsedHeightUnit) && parsedHeightUnit > 0)) &&
    (parsedLengthUnit == null || (Number.isFinite(parsedLengthUnit) && parsedLengthUnit > 0));

  return (
    <PushedScreen title="Add a pet">
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

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <FieldLabel>{`Height (${lengthUnitLabel(state.units)})`}</FieldLabel>
          <TextField
            value={heightInput}
            onChangeText={(t) => setHeightInput(sanitizeMeasurement(t))}
            keyboardType="decimal-pad"
            returnKeyType="done"
            placeholder="0"
          />
        </View>
        <View style={{ flex: 1 }}>
          <FieldLabel>{`Length (${lengthUnitLabel(state.units)})`}</FieldLabel>
          <TextField
            value={lengthInput}
            onChangeText={(t) => setLengthInput(sanitizeMeasurement(t))}
            keyboardType="decimal-pad"
            returnKeyType="done"
            placeholder="0"
          />
        </View>
      </View>
      <Text style={styles.breedHint}>Optional — helps size the care plan later.</Text>

      <View style={{ marginTop: 24 }}>
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
              heightCm: parsedHeightUnit != null ? unitToCm(parsedHeightUnit, state.units) : undefined,
              lengthCm: parsedLengthUnit != null ? unitToCm(parsedLengthUnit, state.units) : undefined,
            });
            if (onboarding === "1") router.replace("/(onboarding)/invite");
            else router.back();
          }}
        >
          Add to family
        </AccentButton>
      </View>
    </PushedScreen>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    breedHint: { fontSize: 12.5, fontFamily: font.regular, color: colors.label3, marginTop: 6, lineHeight: 17 },
  });
