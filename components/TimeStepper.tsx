import { StyleSheet, Text, View } from "react-native";
import { PRESS_SCALE_SMALL, PressableScale } from "@/components/ui";
import { cardShadow, colors, font, radius } from "@/lib/theme";

/**
 * The no-dependency −/+ picker controls, extracted from the reminders add
 * sheet so the schedule editor shares the exact same look and behavior.
 */

/** −/+ stepper with a centered value label. */
export function Stepper({
  label,
  onDec,
  onInc,
  decDisabled = false,
  accessibilityLabel,
}: {
  label: string;
  onDec: () => void;
  onInc: () => void;
  decDisabled?: boolean;
  accessibilityLabel: string;
}) {
  return (
    <View style={styles.stepper} accessibilityLabel={accessibilityLabel}>
      <PressableScale
        scaleTo={PRESS_SCALE_SMALL}
        onPress={onDec}
        disabled={decDisabled}
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel} — decrease`}
        accessibilityState={{ disabled: decDisabled }}
      >
        <View style={[styles.stepperButton, decDisabled && { opacity: 0.3 }]}>
          <Text style={styles.stepperSign}>−</Text>
        </View>
      </PressableScale>
      <Text numberOfLines={1} style={styles.stepperValue}>
        {label}
      </Text>
      <PressableScale
        scaleTo={PRESS_SCALE_SMALL}
        onPress={onInc}
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel} — increase`}
      >
        <View style={styles.stepperButton}>
          <Text style={styles.stepperSign}>+</Text>
        </View>
      </PressableScale>
    </View>
  );
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

/** Stepper specialized for a time of day — steps in 15-minute increments and
 *  wraps around midnight. Value is 24h "HH:MM" (the schedule slot format). */
export function TimeStepper({
  value,
  onChange,
  accessibilityLabel,
  stepMinutes = 15,
}: {
  value: string;
  onChange: (value: string) => void;
  accessibilityLabel: string;
  stepMinutes?: number;
}) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  const hour = m ? Number(m[1]) : 9;
  const minute = m ? Number(m[2]) : 0;
  const step = (dir: 1 | -1) => {
    const total = (hour * 60 + minute + dir * stepMinutes + 1440) % 1440;
    onChange(`${pad(Math.floor(total / 60))}:${pad(total % 60)}`);
  };
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  const label = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return <Stepper label={label} onDec={() => step(-1)} onInc={() => step(1)} accessibilityLabel={accessibilityLabel} />;
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    minHeight: 44,
    flexShrink: 1,
    ...cardShadow,
  },
  stepperButton: { width: 44, height: 44, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  stepperSign: { fontSize: 20, fontFamily: font.semibold, color: colors.accent, lineHeight: 22 },
  stepperValue: {
    minWidth: 56,
    paddingHorizontal: 4,
    textAlign: "center",
    fontSize: 15,
    fontFamily: font.medium,
    color: colors.label,
    flexShrink: 1,
  },
});
