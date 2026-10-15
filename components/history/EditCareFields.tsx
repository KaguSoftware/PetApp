import { StyleSheet, View } from "react-native";
import { clockTime, dayLabel } from "@/lib/format";
import { HIT, Icon, PressableScale, radius, spacing, Text, TextField, useTheme } from "@/ui";

const HOUR = 3_600_000;
const DAY = 86_400_000;

function Step({ label, delta, onStep }: { label: string; delta: number; onStep: (d: number) => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={() => onStep(delta)}
      haptic="select"
      accessibilityRole="button"
      accessibilityLabel={`Move time ${label}`}
      style={[styles.step, { backgroundColor: colors.sunken }]}
    >
      <Text variant="caption">{label}</Text>
    </PressableScale>
  );
}

export interface EditCareFieldsValue {
  ts: number;
  note: string;
  grams: string;
  duration: string;
}

export interface EditCareFieldsProps {
  value: EditCareFieldsValue;
  onChange: (v: EditCareFieldsValue) => void;
  showGrams: boolean;
  showDuration: boolean;
  now: number;
}

/** Time nudgers plus note / grams / duration inputs for a care log. */
export function EditCareFields({ value, onChange, showGrams, showDuration, now }: EditCareFieldsProps) {
  const { colors } = useTheme();
  const nudge = (d: number) => onChange({ ...value, ts: Math.min(now, value.ts + d) });
  return (
    <View style={styles.wrap}>
      <View style={styles.timeRow}>
        <Icon name="history" size={20} color={colors.ink2} />
        <Text variant="bodyStrong" style={styles.time}>
          {dayLabel(value.ts, now)}, {clockTime(value.ts)}
        </Text>
      </View>
      <View style={styles.steps}>
        <Step label="-1 day" delta={-DAY} onStep={nudge} />
        <Step label="-1 h" delta={-HOUR} onStep={nudge} />
        <Step label="-15 min" delta={-15 * 60_000} onStep={nudge} />
        <Step label="+15 min" delta={15 * 60_000} onStep={nudge} />
        <Step label="+1 h" delta={HOUR} onStep={nudge} />
        <Step label="+1 day" delta={DAY} onStep={nudge} />
      </View>
      {showGrams ? (
        <TextField label="Amount (grams)" keyboardType="number-pad" value={value.grams} onChangeText={(grams) => onChange({ ...value, grams })} />
      ) : null}
      {showDuration ? (
        <TextField
          label="Duration (minutes)"
          keyboardType="number-pad"
          value={value.duration}
          onChangeText={(duration) => onChange({ ...value, duration })}
        />
      ) : null}
      <TextField label="Note" multiline value={value.note} onChangeText={(note) => onChange({ ...value, note })} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  timeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  time: { flex: 1 },
  steps: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  step: {
    minHeight: HIT,
    minWidth: HIT + 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
