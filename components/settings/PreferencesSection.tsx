import { StyleSheet, Switch, View } from "react-native";
import { setUnits, useHousehold } from "@/data";
import { useA11yPrefs } from "@/lib/a11y";
import { Section, Row } from "./parts";
import { Segmented } from "./Segmented";
import { Text, useTheme, type ThemePreference } from "@/ui";

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function UnitsSection() {
  const { units } = useHousehold();
  return (
    <Section title="Units">
      <Segmented
        label="Units"
        value={units}
        onChange={(u) => void setUnits(u)}
        options={[
          { value: "metric", label: "Metric (kg)" },
          { value: "imperial", label: "Imperial (lb)" },
        ]}
      />
    </Section>
  );
}

export function AppearanceSection() {
  const { preference, setPreference, colors } = useTheme();
  const a11y = useA11yPrefs();
  return (
    <Section title="Appearance">
      <Segmented label="Theme" value={preference} onChange={setPreference} options={THEMES} />
      <View style={styles.gap}>
        <Text variant="headline" accessibilityRole="header">
          Accessibility
        </Text>
        <Row
          label="Reduce motion"
          hint="Also follows your phone's setting"
          right={
            <Switch
              value={a11y.reduceMotion}
              onValueChange={a11y.setReduceMotion}
              trackColor={{ true: colors.ink, false: colors.border }}
              accessibilityLabel="Reduce motion"
            />
          }
        />
        <Row
          label="Haptics"
          hint="Little taps when you log"
          right={
            <Switch
              value={a11y.haptics}
              onValueChange={a11y.setHaptics}
              trackColor={{ true: colors.ink, false: colors.border }}
              accessibilityLabel="Haptics"
            />
          }
        />
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  gap: { marginTop: 8 },
});
