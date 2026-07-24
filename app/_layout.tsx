import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from "@expo-google-fonts/inter";
import { ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Appearance, LogBox, View } from "react-native";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import NotificationSync from "@/components/NotificationSync";
import { useNativeHeaderOptions } from "@/components/Screen";
import Toasts from "@/components/Toasts";
import { StoreProvider, useStore } from "@/lib/store";
import { useColors, useNavTheme } from "@/lib/theme";
import { PurchasesProvider } from "@/providers/purchases";
import { SessionProvider, useSession } from "@/providers/session";

SplashScreen.preventAutoHideAsync();

// Expected in Expo Go on SDK 53+: expo-notifications warns about remote push
// support being removed, but this app only schedules local notifications.
LogBox.ignoreLogs(["expo-notifications: Android Push notifications"]);

function AppChrome() {
  const { themeMode } = useStore();
  const colors = useColors();
  // The NATIVE root view background. app.json pins userInterfaceStyle to
  // "light", so this defaults to white — and during a push/pop the navigator
  // reveals that root view for a frame beneath the incoming screen, which read
  // as a white flash every time a header button opened a pushed screen in dark
  // mode. Driving it from the live theme paints that base layer dark to match.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors.bg]);
  // THE actual fix for the push-transition flash: app.json's
  // `userInterfaceStyle: "light"` locks the app's native trait collection to
  // light, so every NEWLY CREATED native screen (react-native-screens makes a
  // fresh one per push) starts with the OS's light-mode default background
  // (systemBackground = white on iOS) for the instant before its own RN
  // content paints on top — that instant is the flash. `contentStyle`/
  // `SystemUI.setBackgroundColorAsync` only affect the persistent root/content
  // views, not this native-level default. Overriding the runtime color scheme
  // makes fresh native screens default to OUR dark palette instead.
  useEffect(() => {
    Appearance.setColorScheme(themeMode);
  }, [themeMode]);
  return <StatusBar style={themeMode === "dark" ? "light" : "dark"} />;
}

function RootStack() {
  const nativeHeaderOptions = useNativeHeaderOptions();
  const navTheme = useNavTheme();
  return (
    <ThemeProvider value={navTheme}>
      <Stack screenOptions={{ ...nativeHeaderOptions, title: "" }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}

/**
 * The themed app shell. The outer View is a persistent backdrop painted with
 * the live theme background: during a native push/pop, the moment before the
 * incoming screen's own content paints exposed whatever was behind it, which
 * showed as a light flash in dark mode. A dark backdrop underneath means any
 * such gap reveals the theme background, not white.
 *
 * Splash is held (returns null) until session + fonts + the device-level
 * last-theme cache (`themeReady`) are ALL in — so the very first frame every
 * screen paints already uses the correct appearance instead of flashing the
 * "light" default while the preference resolves. StoreProvider must therefore
 * sit ABOVE this (in Root) so `themeReady` can resolve while splash is still up.
 */
function ThemedApp() {
  const { ready } = useSession();
  const { themeReady } = useStore();
  const colors = useColors();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    GeistPixel: require("@/assets/fonts/GeistPixel.ttf"),
  });

  const appReady = ready && fontsLoaded && themeReady;
  useEffect(() => {
    if (appReady) SplashScreen.hideAsync();
  }, [appReady]);

  if (!appReady) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <RootStack />
      <Toasts />
      <NotificationSync />
      <AppChrome />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <SessionProvider>
          <StoreProvider>
            <PurchasesProvider>
              <ThemedApp />
            </PurchasesProvider>
          </StoreProvider>
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
