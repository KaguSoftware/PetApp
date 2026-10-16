import { Stack } from "expo-router";
import { useStackOptions } from "@/ui";

// Session gating lives in the root layout's Stack.Protected: when a session
// appears this whole group unmounts, so no per-screen redirect is needed (and
// none would fight the OTP flows).
export const unstable_settings = { initialRouteName: "welcome", anchor: "welcome" };

/** Welcome is the bare brand screen; every screen pushed from it gets a native header + back button. */
export default function AuthLayout() {
  return (
    <Stack screenOptions={useStackOptions(true)}>
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
    </Stack>
  );
}
