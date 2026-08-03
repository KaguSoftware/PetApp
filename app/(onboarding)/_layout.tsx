import { Stack } from "expo-router";
import { useNativeHeaderOptions } from "@/components/Screen";

// First-run flow for accounts with zero household memberships (post-0029
// signups aren't demo-seeded). The (tabs) layout redirects here; leaving is
// always by replace() into /home once a household exists.
//
// The entry screen is `start`, NOT `index`, on purpose: a route group adds no
// path segment, so an `index` here would ALSO claim "/" — the same path as
// app/index.tsx — and expo-router could resolve a cold start onto this group's
// first-run screen. It did: every launch flashed "Start a household" until the
// household fetch landed. Never add an index route to this group.
export const unstable_settings = { initialRouteName: "start", anchor: "start" };

export default function OnboardingLayout() {
  const nativeHeaderOptions = useNativeHeaderOptions();
  return (
    <Stack screenOptions={nativeHeaderOptions}>
      <Stack.Screen name="start" options={{ headerShown: false }} />
    </Stack>
  );
}
