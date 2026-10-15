import { useState } from "react";
import { Keyboard, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { addWeight, showToast, useHousehold, useWeights, type Pet, type Species } from "@/data";
import { emitReaction } from "@/lib/reactions";
import { PillButton, PressableScale, Text, fonts, haptic, spacing, useTheme } from "@/ui";
import { StepHeader } from "./StepHeader";
import { WEIGHT_MIN_STEPS, WeightDial } from "./WeightDial";

const LB_PER_KG = 2.2046226;
const DEFAULT_KG = 5;
const MAX_STEPS = 9999;
const TINY_SPECIES: Species[] = ["hamster", "bird", "fish", "reptile"];

/** Hundredths for tiny pets (or anything under 1 kg / 2 lb), tenths otherwise. */
function precisionFor(species: Species, display: number, imperial: boolean): 10 | 100 {
  return TINY_SPECIES.includes(species) || display < (imperial ? 2 : 1) ? 100 : 10;
}

/** Weight is stored in kg; imperial households see and enter pounds. */
export function WeightStep({ pet, onBack, onDone }: { pet: Pet; onBack: () => void; onDone: () => void }) {
  const { colors } = useTheme();
  const { units } = useHousehold();
  const imperial = units === "imperial";
  const unit = imperial ? "lb" : "kg";
  const weights = useWeights(pet.id);

  const [{ steps: tenths, perUnit }, setValue] = useState(() => {
    const kg = weights.length > 0 ? weights[weights.length - 1].kg : (pet.weightKg ?? DEFAULT_KG);
    const display = imperial ? kg * LB_PER_KG : kg;
    const per = precisionFor(pet.species, display, imperial);
    return { steps: Math.min(MAX_STEPS, Math.max(WEIGHT_MIN_STEPS, Math.round(display * per))), perUnit: per };
  });
  const decimals = perUnit === 100 ? 2 : 1;
  const [typing, setTyping] = useState<string | null>(null);

  const setTenths = (steps: number) => setValue((v) => ({ ...v, steps }));

  /** The typed text as a value (never below the dial minimum), or null when it is not a number. */
  const parseTyped = (text: string) => {
    const n = Number(text.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return null;
    const per = precisionFor(pet.species, n, imperial);
    return { steps: Math.min(MAX_STEPS, Math.max(WEIGHT_MIN_STEPS, Math.round(n * per))), perUnit: per };
  };

  const commitTyped = () => {
    if (typing === null) return;
    const parsed = parseTyped(typing);
    if (parsed) setValue(parsed);
    setTyping(null);
  };

  const save = () => {
    Keyboard.dismiss();
    // A value still being typed counts: the Save tap may land before the field blurs.
    const current = (typing !== null ? parseTyped(typing) : null) ?? { steps: tenths, perUnit };
    const display = current.steps / current.perUnit;
    const kg = Math.round((imperial ? display / LB_PER_KG : display) * 1000) / 1000;
    haptic("success");
    emitReaction({ petId: pet.id, type: "weight" });
    addWeight(pet.id, kg)
      .then(() => showToast({ kind: "info", text: `${pet.name} weighs ${display.toFixed(current.perUnit === 100 ? 2 : 1)} ${unit} ✓` }))
      .catch(() => undefined);
    onDone();
  };

  return (
    <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <StepHeader title={`${pet.name}'s weight`} onBack={onBack} />
      <View style={styles.readout}>
        {typing === null ? (
          <PressableScale
            onPress={() => setTyping((tenths / perUnit).toFixed(decimals))}
            haptic="select"
            accessibilityRole="button"
            accessibilityLabel={`${(tenths / perUnit).toFixed(decimals)} ${unit}`}
            accessibilityHint="Tap to type a weight"
            style={styles.number}
          >
            <Text variant="display" style={styles.big}>
              {(tenths / perUnit).toFixed(decimals)}
            </Text>
          </PressableScale>
        ) : (
          <TextInput
            autoFocus
            selectTextOnFocus
            value={typing}
            onChangeText={setTyping}
            onBlur={commitTyped}
            onSubmitEditing={commitTyped}
            keyboardType="decimal-pad"
            maxLength={6}
            accessibilityLabel={`Weight in ${unit}`}
            style={[styles.big, styles.input, { color: colors.ink, borderColor: colors.ink }]}
          />
        )}
        <Text variant="heading" tone="ink2">
          {unit}
        </Text>
      </View>
      <WeightDial key={perUnit} steps={tenths} perUnit={perUnit} onChange={setTenths} />
      <PillButton label="Save weight" icon="check" size="lg" onPress={save} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingBottom: spacing.sm },
  readout: { flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: spacing.sm },
  number: { minHeight: 64, minWidth: 44, justifyContent: "center" },
  big: { fontFamily: fonts.displayXBold, fontSize: 56, lineHeight: 64, letterSpacing: -1 },
  input: { minWidth: 120, textAlign: "center", borderBottomWidth: 3, padding: 0 },
});
