import { Redirect } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { colors } from "@/lib/theme";
import { useSession } from "@/providers/session";

/**
 * The REAL system tab bar (UITabBarController on iOS) — native materials,
 * native selection behavior, SF Symbols. No custom bar, no custom animation.
 */
export default function TabsLayout() {
  const { session } = useSession();
  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <NativeTabs tintColor={colors.accent} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="home">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plan">
        <Icon sf={{ default: "heart.text.square", selected: "heart.text.square.fill" }} />
        <Label>Care</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="logs">
        <Icon sf="list.bullet" />
        <Label>Logs</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="pets">
        <Icon sf={{ default: "pawprint", selected: "pawprint.fill" }} />
        <Label>Pets</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
