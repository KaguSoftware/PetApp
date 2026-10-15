import { Tabs, router } from "expo-router";
import { TabBar, useTheme } from "@/ui";

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
      tabBar={(props) => (
        <TabBar {...props} onLogPress={() => router.push("/log")} onSettingsPress={() => router.push("/settings")} />
      )}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="guide" />
    </Tabs>
  );
}
