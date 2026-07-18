import { StyleSheet, Text, View } from "react-native";
import { PushedScreen } from "@/components/Screen";
import { Group, IconCircle, Row, SectionHeader } from "@/components/ui";
import { useA11yPrefs } from "@/lib/a11y";
import { colors, font } from "@/lib/theme";

/** iOS-style pill toggle, mirroring the web's custom switch visual. */
function Toggle({ on }: { on: boolean }) {
  return (
    <View style={[styles.toggle, on ? styles.toggleOn : styles.toggleOff]}>
      <View style={styles.knob} />
    </View>
  );
}

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
            trailing={<Toggle on={r.on} />}
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
  toggle: { width: 40, height: 24, borderRadius: 12, padding: 2, flexDirection: "row", alignItems: "center" },
  toggleOn: { justifyContent: "flex-end", backgroundColor: colors.green },
  toggleOff: { justifyContent: "flex-start", backgroundColor: colors.fill },
  knob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});
