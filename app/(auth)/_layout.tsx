import { Redirect, Stack } from "expo-router";
import { useSession } from "@/providers/session";

export default function AuthLayout() {
  const { session } = useSession();
  if (session) return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
