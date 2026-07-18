import { Redirect, Tabs } from "expo-router";
import IslandTabBar from "@/components/IslandTabBar";
import { useSession } from "@/providers/session";

export default function TabsLayout() {
  const { session } = useSession();
  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs tabBar={(props) => <IslandTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="plan" options={{ title: "Care" }} />
      <Tabs.Screen name="logs" options={{ title: "Logs" }} />
      <Tabs.Screen name="pets" options={{ title: "Pets" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
