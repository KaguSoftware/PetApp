import { useState } from "react";
import { Keyboard, ScrollView, StyleSheet } from "react-native";
import type { Pet } from "@/data";
import { PillButton, TextField, haptic, spacing } from "@/ui";
import type { CareMeta } from "./careMeta";
import { quickLog, type LogExtra } from "./quickLog";
import { StepHeader } from "./StepHeader";
import { Stepper } from "./Stepper";

const STEP_MIN = 15;
const MAX_MIN_AGO = 24 * 60;

function agoLabel(min: number): string {
  if (min === 0) return "Now";
  const h = Math.floor(min / 60);
  const m = min % 60;
  const span = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m} min`;
  return `${span} ago`;
}

function positive(raw: string): number | undefined {
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

/** Optional details before saving a daily log: time, portion or duration, note. */
export function DetailsStep({ pets, meta, onBack, onDone }: { pets: Pet[]; meta: CareMeta; onBack: () => void; onDone: () => void }) {
  const [minAgo, setMinAgo] = useState(0);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const save = () => {
    Keyboard.dismiss();
    haptic("success");
    const extra: LogExtra = {};
    if (minAgo > 0) extra.ts = Date.now() - minAgo * 60_000;
    if (meta.type === "fed") extra.grams = positive(amount);
    if (meta.type === "walk") extra.durationMinutes = positive(amount);
    if (note.trim()) extra.note = note.trim();
    quickLog(pets, meta.type, extra);
    onDone();
  };

  return (
    <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <StepHeader title={`${meta.label} details`} onBack={onBack} />
      <Stepper
        label="WHEN"
        value={agoLabel(minAgo)}
        minusLabel="15 minutes earlier"
        plusLabel="15 minutes later"
        onMinus={minAgo < MAX_MIN_AGO ? () => setMinAgo((m) => Math.min(MAX_MIN_AGO, m + STEP_MIN)) : undefined}
        onPlus={minAgo > 0 ? () => setMinAgo((m) => Math.max(0, m - STEP_MIN)) : undefined}
      />
      {meta.type === "fed" || meta.type === "walk" ? (
        <TextField
          label={meta.type === "fed" ? "PORTION (GRAMS)" : "DURATION (MINUTES)"}
          value={amount}
          onChangeText={setAmount}
          keyboardType="number-pad"
          placeholder="Optional"
          maxLength={5}
        />
      ) : null}
      <TextField label="NOTE" value={note} onChangeText={setNote} placeholder="Optional" maxLength={200} />
      <PillButton label="Save" icon="check" size="lg" onPress={save} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingBottom: spacing.sm },
});
