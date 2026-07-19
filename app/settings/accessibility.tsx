import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Chevron, Group, IconCircle, Row, SectionHeader, Toggle } from "@/components/ui";
import { PushedScreen } from "@/components/Screen";
import { useA11yPrefs } from "@/lib/a11y";
import { colors, font } from "@/lib/theme";

export default function AccessibilitySettingsPage() {
  const { reduceMotion, reduceTransparency, haptics, setReduceMotion, setReduceTransparency, setHaptics } = useA11yPrefs();

  const toggles = [
    {
      key: "motion",
      icon: "sparkles" as const,
      label: "Reduce motion",
      hint: "Turns off the arcade wobble, coin pops and press animations.",
      on: reduceMotion,
      set: setReduceMotion,
    },
    {
      key: "transparency",
      icon: "drop" as const,
      label: "Reduce transparency",
      hint: "Makes sheet backdrops and overlays solid instead of dimmed glass.",
      on: reduceTransparency,
      set: setReduceTransparency,
    },
    {
      key: "haptics",
      icon: "sparkles" as const,
      label: "Haptic feedback",
      hint: "Small vibrations when you log care, earn coins and tap buttons.",
      on: haptics,
      set: setHaptics,
    },
  ];

  const testHaptics = () => {
    // Fires the same feedback the app uses so the toggle is verifiable — a
    // success buzz when on, a light tick when off so you still get a response.
    if (haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.selectionAsync();
  };

  const openSystemSettings = () => {
    // Text size, bold text and system contrast live in the OS settings; deep-link
    // there rather than half-reimplement them.
    if (Platform.OS === "ios") Linking.openURL("app-settings:");
    else Linking.openSettings();
  };

  return (
    <PushedScreen title="Accessibility">
      <SectionHeader>In-app</SectionHeader>
      <Group>
        {toggles.map((r) => (
          <Row
            key={r.key}
            leading={<IconCircle icon={r.icon} tint={colors.accent} bg={colors.accentSoft} />}
            title={r.label}
            subtitle={r.hint}
            onPress={() => r.set(!r.on)}
            // The row owns the tap; the switch is an indicator (see Toggle).
            switchValue={r.on}
            trailing={<Toggle on={r.on} onChange={r.set} label={r.label} interactive={false} />}
          />
        ))}
        <Row
          leading={<IconCircle icon="sparkles" tint={colors.green} bg={colors.greenSoft} />}
          title="Test haptics"
          subtitle="Feel the current feedback setting"
          onPress={testHaptics}
        />
      </Group>

      <SectionHeader>System</SectionHeader>
      <Group>
        <Row
          leading={<IconCircle icon="eye" tint={colors.label2} bg={colors.fill} />}
          title="Text size, bold & contrast"
          subtitle="Open your device accessibility settings"
          trailing={<Chevron />}
          onPress={openSystemSettings}
        />
      </Group>
      <Text style={styles.footnote}>
        In-app choices are saved on this device. Reduce Motion also follows your system setting automatically, and text scales with
        your device text-size setting.
      </Text>

      <View style={{ height: 16 }} />
    </PushedScreen>
  );
}

const styles = StyleSheet.create({
  footnote: { marginTop: 6, paddingHorizontal: 4, fontSize: 12, fontFamily: font.regular, color: colors.label3, lineHeight: 17 },
});
