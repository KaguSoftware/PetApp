import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { Icon, PressableScale, Text, radius, spacing, useTheme } from "@/ui";

/** Small building blocks for the forms inside the inverted + card. */

export function FormHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <PressableScale
        onPress={onBack}
        haptic="select"
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={[styles.round, { backgroundColor: colors.inverseSurface }]}
      >
        <Icon name="chevron-left" size={22} color={colors.inverseInk} />
      </PressableScale>
      <Text variant="title" tone="inverse" accessibilityRole="header" numberOfLines={1} style={styles.headerTitle}>
        {title}
      </Text>
    </View>
  );
}

/** Full-width pill: inverseInk fill, inverse text. */
export function SavePill({ label = "Save", onPress, disabled = false }: { label?: string; onPress: () => void; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      haptic="tap"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[styles.save, { backgroundColor: colors.inverseInk, opacity: disabled ? 0.4 : 1 }]}
    >
      <Text variant="headline" style={{ color: colors.inverse }}>
        {label}
      </Text>
    </PressableScale>
  );
}

export function Field({ label, style, ...rest }: TextInputProps & { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text variant="caption" tone="inverse2" style={styles.label}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={rest.accessibilityLabel ?? label}
        placeholderTextColor={colors.inverseInk2}
        selectionColor={colors.inverseInk}
        {...rest}
        style={[styles.input, { backgroundColor: colors.inverseSurface, color: colors.inverseInk }, rest.multiline && styles.multiline, style]}
      />
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      haptic="select"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={{ top: 4, bottom: 4 }}
      style={[styles.chip, { backgroundColor: selected ? colors.inverseInk : colors.inverseSurface }]}
    >
      <Text variant="callout" style={{ color: selected ? colors.inverse : colors.inverseInk, fontWeight: "500" }}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** Labelled row with a back and a forward round button around a value; a missing handler disables that side. */
export function Stepper({
  label,
  value,
  onMinus,
  onPlus,
  minusLabel,
  plusLabel,
}: {
  label: string;
  value: string;
  onMinus?: () => void;
  onPlus?: () => void;
  minusLabel: string;
  plusLabel: string;
}) {
  const { colors } = useTheme();
  const btn = (handler: (() => void) | undefined, a11y: string, icon: "chevron-left" | "chevron-right") => (
    <PressableScale
      onPress={handler ?? (() => undefined)}
      disabled={!handler}
      haptic="select"
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: !handler }}
      style={[styles.round, { backgroundColor: colors.inverseSurface, opacity: handler ? 1 : 0.4 }]}
    >
      <Icon name={icon} size={20} color={colors.inverseInk} />
    </PressableScale>
  );
  return (
    <View style={styles.field}>
      <Text variant="caption" tone="inverse2" style={styles.label}>
        {label}
      </Text>
      <View style={styles.stepRow}>
        {btn(onMinus, minusLabel, "chevron-left")}
        <Text variant="headline" tone="inverse" style={styles.stepValue} accessibilityLiveRegion="polite">
          {value}
        </Text>
        {btn(onPlus, plusLabel, "chevron-right")}
      </View>
    </View>
  );
}

const STEP_MIN = 15;
const MAX_MIN_AGO = 24 * 60;

function agoText(min: number): string {
  if (min === 0) return "Now";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m} min`} ago`;
}

/** "Now" by default; the arrows walk the time back (or forward again) in 15 minute steps. */
export function TimeStepper({ minAgo, onChange }: { minAgo: number; onChange: (minAgo: number) => void }) {
  return (
    <Stepper
      label="WHEN"
      value={agoText(minAgo)}
      minusLabel="15 minutes earlier"
      plusLabel="15 minutes later"
      onMinus={minAgo < MAX_MIN_AGO ? () => onChange(Math.min(MAX_MIN_AGO, minAgo + STEP_MIN)) : undefined}
      onPlus={minAgo > 0 ? () => onChange(Math.max(0, minAgo - STEP_MIN)) : undefined}
    />
  );
}

/** Epoch ms for a "minutes ago" offset; undefined (= now, set by the data layer) for 0. */
export function tsFromMinAgo(minAgo: number): number | undefined {
  return minAgo > 0 ? Date.now() - minAgo * 60_000 : undefined;
}

export function positive(raw: string): number | undefined {
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

export const formStyles = StyleSheet.create({
  body: { gap: spacing.lg },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  headerTitle: { flex: 1 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  save: { height: 54, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", alignSelf: "stretch" },
  field: { gap: spacing.xs + 2 },
  label: { paddingHorizontal: spacing.sm },
  input: { minHeight: 50, borderRadius: radius.md, paddingHorizontal: spacing.lg, fontSize: 17 },
  multiline: { minHeight: 110, paddingTop: spacing.md, textAlignVertical: "top" },
  chip: { height: 36, paddingHorizontal: spacing.lg, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  stepRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stepValue: { flex: 1, textAlign: "center" },
});
