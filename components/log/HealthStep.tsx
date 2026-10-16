import { useState } from "react";
import { Keyboard, ScrollView, StyleSheet, View } from "react-native";
import { addMed, addVaccination, addVetVisit, showToast, type Pet } from "@/data";
import { Chip, Icon, PillButton, PressableScale, Text, TextField, haptic, radius, spacing, useTheme, type IconName } from "@/ui";
import { addMonths, dayLabel, isoDay } from "./dates";
import { StepHeader } from "./StepHeader";
import { Stepper } from "./Stepper";

type Kind = "vaccination" | "vet" | "med";

const CHOICES: { kind: Kind; label: string; hint: string; icon: IconName; tone: string }[] = [
  { kind: "vaccination", label: "Vaccination", hint: "Shots and boosters", icon: "health", tone: "mint" },
  { kind: "vet", label: "Vet visit", hint: "Check-ups and treatments", icon: "vet", tone: "ice" },
  { kind: "med", label: "Medication", hint: "Name and dose", icon: "pill", tone: "peach" },
];

const NEXT_DUE: { label: string; months: number | null }[] = [
  { label: "No reminder", months: null },
  { label: "6 months", months: 6 },
  { label: "1 year", months: 12 },
  { label: "3 years", months: 36 },
];

const TITLES: Record<Kind, string> = { vaccination: "Vaccination", vet: "Vet visit", med: "Medication" };

/** Health tile: pick what to record, then a minimal form. */
export function HealthStep({ pet, onBack, onDone }: { pet: Pet; onBack: () => void; onDone: () => void }) {
  const { colors } = useTheme();
  const [kind, setKind] = useState<Kind | null>(null);
  const [text, setText] = useState("");
  const [extra, setExtra] = useState("");
  const [dayOffset, setDayOffset] = useState(0);
  const [nextMonths, setNextMonths] = useState<number | null>(null);

  const ready = text.trim().length > 0;

  const save = () => {
    if (!kind || !ready) return;
    Keyboard.dismiss();
    haptic("success");
    const date = isoDay(dayOffset);
    const base = { petId: pet.id };
    const run =
      kind === "vaccination"
        ? addVaccination({ ...base, name: text.trim(), date, nextDue: nextMonths ? addMonths(date, nextMonths) : null })
        : kind === "vet"
          ? addVetVisit({ ...base, date, reason: text.trim(), notes: extra.trim() || null })
          : addMed({ ...base, name: text.trim(), dose: extra.trim() || null, schedule: null, active: true });
    run.then(() => showToast({ kind: "info", text: `${TITLES[kind]} saved ✓` })).catch(() => undefined);
    onDone();
  };

  if (!kind) {
    return (
      <View style={styles.body}>
        <StepHeader title="What happened?" onBack={onBack} />
        {CHOICES.map((c) => (
          <PressableScale
            key={c.kind}
            onPress={() => setKind(c.kind)}
            haptic="tap"
            accessibilityRole="button"
            accessibilityLabel={c.label}
            accessibilityHint={c.hint}
            style={[styles.choice, { backgroundColor: colors.surface }]}
          >
            <View style={[styles.disc, { backgroundColor: colors.surface }]}>
              <Icon name={c.icon} size={26} color={colors.ink} strokeWidth={2.4} />
            </View>
            <View style={styles.choiceText}>
              <Text variant="title">{c.label}</Text>
              <Text variant="callout" tone="ink2">
                {c.hint}
              </Text>
            </View>
          </PressableScale>
        ))}
      </View>
    );
  }

  return (
    <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <StepHeader title={TITLES[kind]} onBack={() => setKind(null)} />
      <TextField
        label={kind === "vet" ? "REASON" : "NAME"}
        value={text}
        onChangeText={setText}
        placeholder={kind === "vaccination" ? "e.g. Rabies" : kind === "vet" ? "e.g. Annual check-up" : "e.g. Apoquel"}
        maxLength={120}
      />
      {kind === "med" ? (
        <TextField label="DOSE" value={extra} onChangeText={setExtra} placeholder="Optional, e.g. 1 tablet daily" maxLength={120} />
      ) : (
        <Stepper
          label="DATE"
          value={dayLabel(dayOffset)}
          minusLabel="Previous day"
          plusLabel="Next day"
          onMinus={() => setDayOffset((d) => d - 1)}
          onPlus={dayOffset < 0 ? () => setDayOffset((d) => Math.min(0, d + 1)) : undefined}
        />
      )}
      {kind === "vaccination" ? (
        <View style={styles.dueWrap}>
          <Text variant="caption" tone="ink2" style={styles.dueLabel}>
            NEXT DUE
          </Text>
          <View style={styles.chips}>
            {NEXT_DUE.map((n) => (
              <Chip key={n.label} label={n.label} selected={nextMonths === n.months} onPress={() => setNextMonths(n.months)} />
            ))}
          </View>
        </View>
      ) : null}
      {kind === "vet" ? <TextField label="NOTES" value={extra} onChangeText={setExtra} placeholder="Optional" maxLength={300} /> : null}
      <PillButton label="Save" icon="check" size="lg" disabled={!ready} onPress={save} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingBottom: spacing.sm },
  choice: { flexDirection: "row", alignItems: "center", gap: spacing.lg, padding: spacing.lg, borderRadius: radius.lg, minHeight: 76 },
  disc: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  choiceText: { flex: 1 },
  dueWrap: { gap: spacing.sm },
  dueLabel: { paddingHorizontal: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
