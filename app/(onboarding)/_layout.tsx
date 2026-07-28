import { Stack } from "expo-router";
import { useNativeHeaderOptions } from "@/components/Screen";

// First-run flow for accounts with zero household memberships (post-0029
// signups aren't demo-seeded). The (tabs) layout redirects here; leaving is
// always by replace() into /home once a household exists.
export const unstable_settings = { initialRouteName: "index", anchor: "index" };

export default function OnboardingLayout() {
  const nativeHeaderOptions = useNativeHeaderOptions();
  return (
    <Stack screenOptions={nativeHeaderOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
