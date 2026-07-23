import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect } from "expo-router";
import { Icon, Label, NativeTabs, VectorIcon } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";
import { colors } from "@/lib/theme";
import { useSession } from "@/providers/session";

/**
 * The REAL system tab bar (UITabBarController on iOS). iOS uses SF Symbols; on
 * Android SF Symbols don't exist, so each tab ships an `androidSrc` built with
 * NativeTabs' own `VectorIcon` helper over @expo/vector-icons (Ionicons) — that
 * rasterizes the glyph into an image the native Android bar can actually draw.
 * We also set `backgroundColor`/`iconColor` so the bar renders opaque instead
 * of blending into the page (the "invisible bar" on some Android skins).
 */
const androidIcon = (name: React.ComponentProps<typeof Ionicons>["name"]) => (
  <VectorIcon family={Ionicons} name={name} />
);

export default function TabsLayout() {
  const { session } = useSession();
  if (!session) return <Redirect href="/(auth)/login" />;

  // Tab order: Logs (leftmost), Care, Home (center), Pets, Community.
  // Settings moved off the tab bar to the gear icon in HeaderActions.
  return (
    <NativeTabs
      tintColor={colors.accent}
      iconColor={Platform.OS === "android" ? colors.label2 : undefined}
      backgroundColor={Platform.OS === "android" ? colors.card : undefined}
      // Android's BottomNavigationView splits the bar into 5 equal-width
      // slots and clips the label instead of shrinking it — "Community" (the
      // longest of the 5) loses its trailing "y" on narrower/high-density
      // phones (reported on a Huawei P60 Pro). A point smaller avoids the clip.
      labelStyle={Platform.OS === "android" ? { fontSize: 11 } : undefined}
    >
      <NativeTabs.Trigger name="logs">
        <Icon sf="list.bullet" androidSrc={androidIcon("list")} />
        <Label>Logs</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plan">
        <Icon sf={{ default: "heart.text.square", selected: "heart.text.square.fill" }} androidSrc={androidIcon("heart")} />
        <Label>Care</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="home">
        <Icon sf={{ default: "house", selected: "house.fill" }} androidSrc={androidIcon("home")} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="pets">
        <Icon sf={{ default: "pawprint", selected: "pawprint.fill" }} androidSrc={androidIcon("paw")} />
        <Label>Pets</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="community">
        <Icon sf={{ default: "bubble.left.and.bubble.right", selected: "bubble.left.and.bubble.right.fill" }} androidSrc={androidIcon("chatbubbles")} />
        <Label>Community</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
