import { Redirect } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { Icon as VectorIcon, type IconName } from "@/components/Icons";
import { colors } from "@/lib/theme";
import { useSession } from "@/providers/session";

/**
 * The REAL system tab bar (UITabBarController on iOS) — native materials,
 * native selection behavior, SF Symbols. On iOS the icons are SF Symbols; on
 * Android SF Symbols don't exist (the glyphs render blank — the tab is tappable
 * but invisible), so every tab also ships an `androidSrc` drawn from our own
 * stroke icon set so the bar renders on every device.
 */
const androidIcon = (name: IconName) => <VectorIcon name={name} size={26} color={colors.label} />;

export default function TabsLayout() {
  const { session } = useSession();
  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <NativeTabs tintColor={colors.accent} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="home">
        <Icon sf={{ default: "house", selected: "house.fill" }} androidSrc={androidIcon("home")} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plan">
        <Icon sf={{ default: "heart.text.square", selected: "heart.text.square.fill" }} androidSrc={androidIcon("heart-text")} />
        <Label>Care</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="logs">
        <Icon sf="list.bullet" androidSrc={androidIcon("list")} />
        <Label>Logs</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="pets">
        <Icon sf={{ default: "pawprint", selected: "pawprint.fill" }} androidSrc={androidIcon("paw")} />
        <Label>Pets</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} androidSrc={androidIcon("gear")} />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
