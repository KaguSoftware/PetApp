import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import BreedField from "@/components/BreedField";
import { Icon } from "@/components/Icons";
import { PushedScreen } from "@/components/Screen";
import SpeciesField from "@/components/SpeciesField";
import { DONE_ACCESSORY_ID, FieldLabel, KeyboardDoneAccessory, Segmented, TextField } from "@/components/ui";
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

/** "Name", "Name and Age", "Name, Age and Weight" — a readable field list for
 *  the validation toast. */
function listAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
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
  const { state, addPet, toast } = useStore();
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

  // Per-field validity, so a failed submit can point at the exact boxes that
  // need attention instead of just refusing to do anything.
  //
  // The `.trim()` guards are load-bearing: Number("") and Number(" ") are both
  // 0, not NaN, so a blank age would otherwise pass `>= 0` and save as zero.
  const nameOk = petName.trim().length > 0;
  const ageOk = ageInput.trim() !== "" && Number.isFinite(parsedAge) && parsedAge >= 0;
  const weightOk = weightInput.trim() !== "" && Number.isFinite(parsedWeightUnit) && parsedWeightUnit > 0;
  const cupOk = cupInput.trim() !== "" && Number.isFinite(parsedCup) && parsedCup > 0;
  const heightOk = parsedHeightUnit == null || (Number.isFinite(parsedHeightUnit) && parsedHeightUnit > 0);
  const lengthOk = parsedLengthUnit == null || (Number.isFinite(parsedLengthUnit) && parsedLengthUnit > 0);
  const valid = nameOk && ageOk && weightOk && cupOk && heightOk && lengthOk;

  // Errors stay hidden until the first failed submit — a form that turns red
  // while you're still filling in the first box is hostile. After that they
  // stay live so each field clears as it's fixed.
  const [showErrors, setShowErrors] = useState(false);

  const submit = () => {
    if (!valid) {
      setShowErrors(true);
      Keyboard.dismiss();
      // Name the offending fields rather than a bare "form invalid" — the red
      // border may be scrolled out of view when the checkmark is pressed.
      const missing = [
        !nameOk && "Name",
        !ageOk && "Age",
        !weightOk && "Weight",
        !cupOk && "Cup size",
        !heightOk && "Height",
        !lengthOk && "Length",
      ].filter((f): f is string => typeof f === "string");
      toast("alert", "Fill in the required fields", `Check ${listAnd(missing)}`);
      return;
    }
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
  };

  // Submit lives in the nav bar as a confirm checkmark rather than a button at
  // the bottom of the form. Chromeless — no pill, no fill — so it matches the
  // other nav-bar glyphs.
  //
  // Deliberately NOT `disabled` when the form is incomplete: pressing it is how
  // the user asks "what's missing?", and a disabled Pressable swallows the
  // press, so the red borders would never appear. It dims instead, and `submit`
  // decides whether to save or surface the errors.
  const saveButton = (
    <Pressable
      onPress={submit}
      accessibilityRole="button"
      accessibilityLabel="Add to family"
      hitSlop={6}
      style={({ pressed }) => [styles.saveButton, pressed && { opacity: 0.6 }]}
    >
      <Icon
        name="check"
        size={Platform.OS === "ios" ? 25 : 21}
        color={valid ? colors.accent : colors.label3}
        strokeWidth={2.5}
      />
    </Pressable>
  );

  return (
    <PushedScreen title="Add a pet" trailing={saveButton}>
      <FieldLabel required>Name</FieldLabel>
      {/* The text keyboard has its own return key, but the Done bar rides above
          it too so every field on the form dismisses the same way. */}
      <TextField
        value={petName}
        onChangeText={setPetName}
        placeholder="e.g. Mochi"
        returnKeyType="done"
        onSubmitEditing={() => Keyboard.dismiss()}
        inputAccessoryViewID={DONE_ACCESSORY_ID}
        invalid={showErrors && !nameOk}
      />

      <FieldLabel>Species</FieldLabel>
      <SpeciesField
        presentation="sheet"
        species={species}
        onChangeSpecies={(s) => {
          setSpecies(s);
          setBreed(BREEDS_BY_SPECIES[s][0]);
          setCustomBreed("");
          prefillFor(s);
        }}
      />

      <FieldLabel>Breed</FieldLabel>
      <BreedField
        presentation="sheet"
        species={species}
        breed={breed}
        customBreed={customBreed}
        onChangeBreed={setBreed}
        onChangeCustomBreed={setCustomBreed}
      />
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
          <FieldLabel required>Age (years)</FieldLabel>
          <TextField
            value={ageInput}
            onChangeText={setAgeInput}
            keyboardType="decimal-pad"
            inputAccessoryViewID={DONE_ACCESSORY_ID}
            placeholder="1"
            invalid={showErrors && !ageOk}
          />
        </View>
        <View style={{ flex: 1 }}>
          <FieldLabel required>{`Weight (${weightUnitLabel(state.units)})`}</FieldLabel>
          <TextField
            value={weightInput}
            onChangeText={setWeightInput}
            keyboardType="decimal-pad"
            inputAccessoryViewID={DONE_ACCESSORY_ID}
            placeholder="0"
            invalid={showErrors && !weightOk}
          />
        </View>
      </View>

      <FieldLabel required>Cup size (grams of food per cup)</FieldLabel>
      <TextField
        value={cupInput}
        onChangeText={setCupInput}
        keyboardType="number-pad"
        inputAccessoryViewID={DONE_ACCESSORY_ID}
        placeholder="60"
        invalid={showErrors && !cupOk}
      />

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <FieldLabel>{`Height (${lengthUnitLabel(state.units)})`}</FieldLabel>
          <TextField
            value={heightInput}
            onChangeText={(t) => setHeightInput(sanitizeMeasurement(t))}
            keyboardType="decimal-pad"
            inputAccessoryViewID={DONE_ACCESSORY_ID}
            placeholder="0"
            invalid={showErrors && !heightOk}
          />
        </View>
        <View style={{ flex: 1 }}>
          <FieldLabel>{`Length (${lengthUnitLabel(state.units)})`}</FieldLabel>
          <TextField
            value={lengthInput}
            onChangeText={(t) => setLengthInput(sanitizeMeasurement(t))}
            keyboardType="decimal-pad"
            inputAccessoryViewID={DONE_ACCESSORY_ID}
            placeholder="0"
            invalid={showErrors && !lengthOk}
          />
        </View>
      </View>
      <Text style={styles.breedHint}>Optional — helps size the care plan later.</Text>

      {/* One toolbar for every numeric field above — they share DONE_ACCESSORY_ID,
          and iOS attaches whichever accessory matches the focused input. */}
      <KeyboardDoneAccessory />
    </PushedScreen>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    breedHint: { fontSize: 12.5, fontFamily: font.regular, color: colors.label3, marginTop: 6, lineHeight: 17 },
    // Chromeless 38pt glyph box — the same header metrics as the bell/gear and
    // reminders' add button, so every nav-bar control lines up.
    saveButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  });
