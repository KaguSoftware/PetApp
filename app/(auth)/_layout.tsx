import { Redirect, Stack } from "expo-router";
import { useSession } from "@/providers/session";

export default function AuthLayout() {
  const { session } = useSession();
  if (session) return <Redirect href="/home" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
