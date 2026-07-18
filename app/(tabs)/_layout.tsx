import { Redirect, Tabs } from "expo-router";
import { Icon, type IconName } from "@/components/Icons";
import { colors } from "@/lib/theme";
import { useSession } from "@/providers/session";

const TAB_ICON: Record<string, IconName> = {
  index: "home",
  plan: "heart-text",
  logs: "list",
  pets: "paw",
  settings: "gear",
};

export default function TabsLayout() {
  const { session } = useSession();
  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.label3,
        tabBarLabelStyle: { fontFamily: "Inter_500Medium", fontSize: 10 },
        tabBarIcon: ({ color }) => <Icon name={TAB_ICON[route.name] ?? "home"} size={24} color={color} />,
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="plan" options={{ title: "Care" }} />
      <Tabs.Screen name="logs" options={{ title: "Logs" }} />
      <Tabs.Screen name="pets" options={{ title: "Pets" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
