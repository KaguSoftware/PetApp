import { Stack } from "expo-router";

// Session gating lives in the root layout's Stack.Protected — when a session
// appears this whole group unmounts and the router lands on /home, so no
// per-screen redirect is needed (and none would fight the OTP flows).
export const unstable_settings = { initialRouteName: "welcome", anchor: "welcome" };

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
