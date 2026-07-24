import { Stack } from "expo-router";
import { useTabStackScreenOptions } from "@/components/Screen";

export default function TabStack() {
  const tabStackScreenOptions = useTabStackScreenOptions();
  return <Stack screenOptions={tabStackScreenOptions} />;
}
