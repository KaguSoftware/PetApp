import { Stack } from "expo-router";
import { useNativeHeaderOptions } from "@/components/Screen";

// Same header options as every other stack in the app — the tab stacks used to
// blank the title here, which also blanked it for screens pushed inside them.
export default function TabStack() {
  const headerOptions = useNativeHeaderOptions();
  return <Stack screenOptions={headerOptions} />;
}
