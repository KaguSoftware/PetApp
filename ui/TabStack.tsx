import { Stack } from "expo-router";
import { useStackOptions } from "./stackOptions";

/** The nested native Stack inside each tab: native (large-title) headers, tab bar stays visible. */
export function TabStack() {
  return <Stack screenOptions={useStackOptions(true)} />;
}
