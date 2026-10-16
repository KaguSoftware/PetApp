import { StyleSheet, View } from "react-native";
import { Icon, PressableScale, Text, borderWidth, radius, spacing, useTheme } from "@/ui";

interface StepperProps {
  label: string;
  value: string;
  onMinus?: () => void;
  onPlus?: () => void;
  minusLabel: string;
  plusLabel: string;
}

/** Labelled row with minus and plus round buttons around a value; a missing handler disables that side. */
export function Stepper({ label, value, onMinus, onPlus, minusLabel, plusLabel }: StepperProps) {
  const { colors } = useTheme();
  const btn = (handler: (() => void) | undefined, a11y: string, flip: boolean) => (
    <PressableScale
      onPress={handler ?? (() => undefined)}
      disabled={!handler}
      haptic="select"
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: !handler }}
      style={[styles.btn, { backgroundColor: colors.surface, borderColor: colors.border, opacity: handler ? 1 : 0.4 }]}
    >
      <View style={flip ? styles.flip : undefined}>
        <Icon name="chevron" size={20} color={colors.ink} />
      </View>
    </PressableScale>
  );
  return (
    <View style={styles.wrap}>
      <Text variant="caption" tone="ink2" style={styles.label}>
        {label}
      </Text>
      <View style={styles.row}>
        {btn(onMinus, minusLabel, true)}
        <Text variant="headline" style={styles.value} accessibilityLiveRegion="polite">
          {value}
        </Text>
        {btn(onPlus, plusLabel, false)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs + 2 },
  label: { paddingHorizontal: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  value: { flex: 1, textAlign: "center" },
  btn: { width: 48, height: 48, borderRadius: radius.pill, borderWidth, alignItems: "center", justifyContent: "center" },
  flip: { transform: [{ scaleX: -1 }] },
});
