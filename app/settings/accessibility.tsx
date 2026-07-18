import { StyleSheet, Text, View } from "react-native";
import { PushedScreen } from "@/components/Screen";
import { Group, IconCircle, Row, SectionHeader, Toggle } from "@/components/ui";
import { useA11yPrefs } from "@/lib/a11y";
import { colors, font } from "@/lib/theme";

// SCOPE(later): motion/transparency not yet consumed app-wide
export default function AccessibilitySettingsPage() {
  const { reduceMotion, reduceTransparency, setReduceMotion, setReduceTransparency } = useA11yPrefs();

  const rows = [
    {
      key: "motion",
      icon: "sparkles" as const,
      label: "Reduce motion",
      hint: "Turns off the arcade wobble, coin pops and other animations.",
      on: reduceMotion,
      set: setReduceMotion,
    },
    {
      key: "transparency",
      icon: "drop" as const,
      label: "Reduce transparency",
      hint: "Makes the glass tab bar, headers and toasts solid instead of blurred.",
      on: reduceTransparency,
      set: setReduceTransparency,
    },
  ];

  return (
    <PushedScreen title="Accessibility">
      <SectionHeader>Display</SectionHeader>
      <Group>
        {rows.map((r) => (
          <Row
            key={r.key}
            leading={<IconCircle icon={r.icon} tint={colors.accent} bg={colors.accentSoft} />}
            title={r.label}
            subtitle={r.hint}
            onPress={() => r.set(!r.on)}
            trailing={<Toggle on={r.on} onChange={r.set} label={r.label} />}
          />
        ))}
      </Group>
      <Text style={styles.footnote}>
        Saved on this device. Motion also follows your system &ldquo;Reduce Motion&rdquo; setting automatically.
      </Text>

      <View style={{ height: 16 }} />
    </PushedScreen>
  );
}

const styles = StyleSheet.create({
  footnote: { marginTop: 6, paddingHorizontal: 4, fontSize: 12, fontFamily: font.regular, color: colors.label3 },
});
