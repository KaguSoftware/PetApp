import Ionicons from "@expo/vector-icons/Ionicons";
import { Icon, Label, NativeTabs, VectorIcon } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";
import { useTheme } from "@/ui";

/**
 * The real system tab bar (UITabBarController / Android BottomNavigationView).
 * iOS uses SF Symbols (filled when selected); Android has no SF Symbols, so each
 * tab ships an `androidSrc` rasterised by NativeTabs' own `VectorIcon` helper.
 * Docs: https://docs.expo.dev/router/advanced/native-tabs/ (SDK 54 API:
 * imports from `expo-router/unstable-native-tabs`).
 */
const androidIcon = (name: React.ComponentProps<typeof Ionicons>["name"]) => <VectorIcon family={Ionicons} name={name} />;

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
        <Icon sf={{ default: "house", selected: "house.fill" }} androidSrc={androidIcon("home-outline")} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <Icon sf={{ default: "clock", selected: "clock.fill" }} androidSrc={androidIcon("time-outline")} />
        <Label>History</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="guide">
        <Icon sf={{ default: "book", selected: "book.fill" }} androidSrc={androidIcon("book-outline")} />
        <Label>Guide</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
