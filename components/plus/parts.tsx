import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { Component, useState, type ReactNode } from "react";
import { Platform, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { Icon, PressableScale, Text, radius, spacing, useTheme } from "@/ui";

/** Small building blocks for the forms inside the inverted + card. */

/**
 * Every form ends with its Save pill on the same line as the card's close button, which
 * sits in the card's bottom-right 60pt corner: the pill stops this far short of the content edge.
 */
export const SAVE_INSET = 44;

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

/** 52pt pill: inverseInk fill, inverse text. */
export function SavePill({ label = "Save", onPress, disabled = false }: { label?: string; onPress: () => void; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.96}
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

/** Epoch ms for a picked time of day: a time later than now means yesterday evening, never the future. */
export function tsFromPicked(picked: Date, now: number = Date.now()): number {
  const ts = picked.getTime();
  return ts > now ? ts - 24 * 60 * 60_000 : ts;
}

function shown(value: Date, mode: "time" | "date"): string {
  return mode === "time"
    ? value.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : value.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

/** If the native picker view is missing (a runtime without it), the row still shows the value instead of crashing the panel. */
class PickerBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export interface PickerFieldProps {
  label: string;
  value: Date;
  mode: "time" | "date";
  onChange: (next: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}

/**
 * A label and the platform's own date/time picker, on one 52pt row.
 * iOS: the native compact picker (SwiftUI) sits on the row; tapping it opens Apple's popover.
 * Android: Material 3 only offers dialogs, so the row shows the value and a tap opens the native dialog.
 * Both come from `@expo/ui/community/datetime-picker`, forced to the dark look on the black card.
 */
export function PickerField({ label, value, mode, onChange, minimumDate, maximumDate }: PickerFieldProps) {
  const { colors } = useTheme();
  const [dialog, setDialog] = useState(false);
  const common = {
    value,
    mode,
    minimumDate,
    maximumDate,
    accentColor: colors.inverseInk,
    // The card is the inverse of the app theme, so a light app needs the dark picker.
    themeVariant: colors.scheme === "light" ? ("dark" as const) : ("light" as const),
  };
  const text = (
    <Text variant="headline" tone="inverse">
      {shown(value, mode)}
    </Text>
  );

  if (Platform.OS === "android") {
    return (
      <>
        <PressableScale
          onPress={() => setDialog(true)}
          haptic="select"
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${shown(value, mode)}`}
          style={[styles.pickRow, { backgroundColor: colors.inverseSurface }]}
        >
          <Text variant="caption" tone="inverse2">
            {label}
          </Text>
          {text}
        </PressableScale>
        {dialog ? (
          <DateTimePicker
            {...common}
            presentation="dialog"
            onValueChange={(_, d) => {
              setDialog(false);
              onChange(d);
            }}
            onDismiss={() => setDialog(false)}
          />
        ) : null}
      </>
    );
  }

  return (
    <View style={[styles.pickRow, { backgroundColor: colors.inverseSurface }]}>
      <Text variant="caption" tone="inverse2">
        {label}
      </Text>
      <PickerBoundary fallback={text}>
        <DateTimePicker
          {...common}
          display="compact"
          style={mode === "time" ? styles.timePicker : styles.datePicker}
          onValueChange={(_, d) => onChange(d)}
        />
      </PickerBoundary>
    </View>
  );
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
  header: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  headerTitle: { flex: 1 },
  round: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  save: { height: 52, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", alignSelf: "stretch", marginRight: SAVE_INSET },
  field: { gap: spacing.sm },
  label: { paddingHorizontal: spacing.sm },
  input: { minHeight: 52, borderRadius: radius.md, paddingHorizontal: spacing.lg, fontSize: 17 },
  multiline: { minHeight: 110, paddingTop: spacing.md, textAlignVertical: "top" },
  chip: { height: 36, paddingHorizontal: spacing.lg, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  pickRow: { height: 52, borderRadius: radius.md, paddingHorizontal: spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  timePicker: { width: 112, height: 36 },
  datePicker: { width: 150, height: 36 },
});
