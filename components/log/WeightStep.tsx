import { useState } from "react";
import { Keyboard, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { addWeight, showToast, useHousehold, useWeights, type Pet } from "@/data";
import { emitReaction } from "@/lib/reactions";
import { PillButton, PressableScale, Text, fonts, haptic, spacing, useTheme } from "@/ui";
import { StepHeader } from "./StepHeader";
import { WeightDial } from "./WeightDial";

const LB_PER_KG = 2.2046226;
const DEFAULT_KG = 5;

/** Weight is stored in kg; imperial households see and enter pounds. */
export function WeightStep({ pet, onBack, onDone }: { pet: Pet; onBack: () => void; onDone: () => void }) {
  const { colors } = useTheme();
  const { units } = useHousehold();
  const imperial = units === "imperial";
  const unit = imperial ? "lb" : "kg";
  const weights = useWeights(pet.id);

  const [tenths, setTenths] = useState(() => {
    const kg = weights.length > 0 ? weights[weights.length - 1].kg : (pet.weightKg ?? DEFAULT_KG);
    return Math.max(1, Math.round((imperial ? kg * LB_PER_KG : kg) * 10));
  });
  const [typing, setTyping] = useState<string | null>(null);

  const commitTyped = () => {
    if (typing === null) return;
    const n = Number(typing.replace(",", "."));
    if (Number.isFinite(n) && n > 0) setTenths(Math.min(9999, Math.round(n * 10)));
    setTyping(null);
  };

  const save = () => {
    Keyboard.dismiss();
    const display = tenths / 10;
    const kg = Math.round((imperial ? display / LB_PER_KG : display) * 1000) / 1000;
    haptic("success");
    emitReaction({ petId: pet.id, type: "weight" });
    addWeight(pet.id, kg)
      .then(() => showToast({ kind: "info", text: `${pet.name} weighs ${display.toFixed(1)} ${unit} ✓` }))
      .catch(() => undefined);
    onDone();
  };

  return (
    <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <StepHeader title={`${pet.name}'s weight`} onBack={onBack} />
      <View style={styles.readout}>
        {typing === null ? (
          <PressableScale
            onPress={() => setTyping((tenths / 10).toFixed(1))}
            haptic="select"
            accessibilityRole="button"
            accessibilityLabel={`${(tenths / 10).toFixed(1)} ${unit}`}
            accessibilityHint="Tap to type a weight"
            style={styles.number}
          >
            <Text variant="display" style={styles.big}>
              {(tenths / 10).toFixed(1)}
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
      <WeightDial tenths={tenths} onChange={setTenths} />
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
