import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Chevron, Group, IconCircle, Row, SectionHeader, Segmented, Toggle } from "@/components/ui";
import { PushedScreen } from "@/components/Screen";
import type { IconName } from "@/components/Icons";
import { useA11yPrefs } from "@/lib/a11y";
import { useStore, type ThemeMode } from "@/lib/store";
import { font, useColors, type Colors } from "@/lib/theme";

/** Icon for the appearance row's leading circle, per preference. */
const APPEARANCE_ICON: Record<ThemeMode, IconName> = { system: "sparkles", light: "sun", dark: "moon" };

export default function AccessibilitySettingsPage() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { reduceMotion, reduceTransparency, haptics, setReduceMotion, setReduceTransparency, setHaptics } = useA11yPrefs();
  const { themeMode, setThemeMode, resolvedTheme, toast } = useStore();

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
      <SectionHeader>Appearance</SectionHeader>
      <Group>
        {/* Full-width rather than a trailing control: three labelled options
            don't fit legibly in a Row's trailing slot. */}
        <View style={styles.appearanceRow}>
          <View style={styles.appearanceHeader}>
            <IconCircle icon={APPEARANCE_ICON[themeMode]} tint={colors.accent} bg={colors.accentSoft} />
            <View style={styles.appearanceText}>
              <Text style={styles.appearanceTitle}>Appearance</Text>
              <Text style={styles.appearanceHint}>
                {themeMode === "system"
                  ? `Following your system setting — currently ${resolvedTheme}.`
                  : `Always ${themeMode}, whatever your system is set to.`}
              </Text>
            </View>
          </View>
          <Segmented
            options={[
              { value: "system", label: "System", icon: "sparkles" },
              { value: "light", label: "Light", icon: "sun" },
              { value: "dark", label: "Dark", icon: "moon" },
            ]}
            value={themeMode}
            onChange={(m) => {
              setThemeMode(m);
              if (m === "system") toast("sparkles", "Appearance follows your system setting", "");
              else toast(m === "dark" ? "moon" : "sun", `Switched to ${m} mode`, "");
            }}
          />
        </View>
      </Group>

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

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    footnote: { marginTop: 6, paddingHorizontal: 4, fontSize: 12, fontFamily: font.regular, color: colors.label3, lineHeight: 17 },
    // Mirrors ui.tsx's `row` padding so this stacked variant lines up with the
    // ordinary Rows in the groups below it.
    appearanceRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
    appearanceHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
    appearanceText: { flex: 1, minWidth: 0 },
    appearanceTitle: { fontSize: 16, fontFamily: font.medium, color: colors.label },
    appearanceHint: { fontSize: 13, fontFamily: font.regular, color: colors.label2, marginTop: 1 },
  });
