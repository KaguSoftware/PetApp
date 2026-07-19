import { Stack } from "expo-router";
import { tabStackScreenOptions } from "@/components/Screen";

export default function TabStack() {
  return <Stack screenOptions={tabStackScreenOptions} />;
}
