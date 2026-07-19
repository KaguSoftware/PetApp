import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LogBox } from "react-native";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import NotificationSync from "@/components/NotificationSync";
import { nativeHeaderOptions } from "@/components/Screen";
import Toasts from "@/components/Toasts";
import { StoreProvider } from "@/lib/store";
import { PurchasesProvider } from "@/providers/purchases";
import { SessionProvider, useSession } from "@/providers/session";

SplashScreen.preventAutoHideAsync();

// Expected in Expo Go on SDK 53+: expo-notifications warns about remote push
// support being removed, but this app only schedules local notifications.
LogBox.ignoreLogs(["expo-notifications: Android Push notifications"]);

function Root() {
  const { ready } = useSession();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    GeistPixel: require("@/assets/fonts/GeistPixel.ttf"),
  });

  useEffect(() => {
    if (ready && fontsLoaded) SplashScreen.hideAsync();
  }, [ready, fontsLoaded]);

  if (!ready || !fontsLoaded) return null;

  return (
    <StoreProvider>
      <PurchasesProvider>
        <Stack screenOptions={{ ...nativeHeaderOptions, title: "" }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        <Toasts />
        <NotificationSync />
        <StatusBar style="dark" />
      </PurchasesProvider>
    </StoreProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <SessionProvider>
          <Root />
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
