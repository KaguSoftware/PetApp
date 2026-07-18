import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import NotificationSync from "@/components/NotificationSync";
import { nativeHeaderOptions } from "@/components/Screen";
import Toasts from "@/components/Toasts";
import { StoreProvider } from "@/lib/store";
import { PurchasesProvider } from "@/providers/purchases";
import { SessionProvider, useSession } from "@/providers/session";

SplashScreen.preventAutoHideAsync();

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
