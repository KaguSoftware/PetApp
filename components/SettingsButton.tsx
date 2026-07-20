import { useRouter } from "expo-router";
import { Platform, Pressable, StyleSheet } from "react-native";
import { Icon } from "@/components/Icons";
import { colors } from "@/lib/theme";

/**
 * Top-right gear on tab pages — Settings moved off the tab bar (to make room
 * for Community) and lives behind this icon instead, mirroring NotificationBell.
 *
 * Renders unconditionally: this only appears in tab headers, and /settings is a
 * pushed screen with its own native header, so it can never push onto itself.
 * (It used to return null inside the settings stack, which changed the header's
 * subview count between screens and destabilised native hit-testing.)
 */
export default function SettingsButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push("/settings")}
      accessibilityLabel="Settings"
      accessibilityRole="button"
      // 38pt pill + 6pt each side = a 50pt touch target (>= the 44pt minimum),
      // sized so it can't overlap the neighbouring control.
      hitSlop={6}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.6 }]}
    >
      <Icon name="gear" size={21} color={colors.label} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    // Keep the card background/border on Android; clear on iOS.
    ...(Platform.OS === "android"
      ? {
          backgroundColor: colors.card,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.sep,
        }
      : null),
  },
});
