import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";
import { useTheme } from "@/ui";

/**
 * The real system tab bar (UITabBarController / Android BottomNavigationView).
 * iOS uses SF Symbols (filled when selected); Android uses Material Symbols via `md`.
 * Docs: https://docs.expo.dev/router/advanced/native-tabs/ (SDK 57 compound API:
 * `NativeTabs.Trigger.Icon` / `.Label`, imported from `expo-router/unstable-native-tabs`).
 */
export default function TabsLayout() {
  const { colors, scheme } = useTheme();
  return (
    <NativeTabs
      // Android's bar does not reliably repaint on colour-only prop changes: remount per scheme.
      key={scheme}
      tintColor={colors.ink}
      iconColor={Platform.OS === "android" ? colors.ink3 : undefined}
      backgroundColor={Platform.OS === "android" ? colors.bg : undefined}
    >
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} md="home" />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Icon sf={{ default: "clock", selected: "clock.fill" }} md="schedule" />
        <NativeTabs.Trigger.Label>History</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="guide">
        <NativeTabs.Trigger.Icon sf={{ default: "book", selected: "book.fill" }} md="menu_book" />
        <NativeTabs.Trigger.Label>Guide</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
