import { Switch } from "react-native";
import { setUnits, useHousehold } from "@/data";
import { useA11yPrefs } from "@/lib/a11y";
import { MenuRow, useTheme, type ThemePreference } from "@/ui";
import { Row, Section } from "./parts";

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function UnitsSection() {
  const { units } = useHousehold();
  return (
    <Section title="Units">
      <MenuRow<"metric" | "imperial">
        variant="plain"
        label="Weight units"
        selected={units}
        onSelect={(u) => void setUnits(u)}
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
      <MenuRow<ThemePreference> variant="plain" label="Theme" selected={preference} onSelect={setPreference} options={THEMES} />
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
    </Section>
  );
}
