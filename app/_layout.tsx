import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from "@expo-google-fonts/inter";
import { DefaultTheme, DarkTheme, ThemeProvider as NavThemeProvider, type Theme } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, initialWindowMetrics, useSafeAreaInsets } from "react-native-safe-area-context";
import { InviteLinkHandler } from "@/components/onboarding/InviteLinkHandler";
import { DataProvider, dismissToast, useSession, useToasts } from "@/data";
import { ThemeProvider, ToastHost, fonts, useTheme } from "@/ui";

SplashScreen.preventAutoHideAsync();

/** Floating tab bar (68) + raised Log button (26) + a small gap, measured from the bar's own bottom padding. */
const BAR_STACK = 68 + 26 + 8;

function useNavTheme(): Theme {
  const { colors, scheme } = useTheme();
  return useMemo(() => {
    const base = scheme === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, background: colors.bg, card: colors.bg, border: colors.border, text: colors.ink, primary: colors.ink },
    };
  }, [colors, scheme]);
}

function RootStack() {
  const { session } = useSession();
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      {/* Gating lives here, once. Routes outside a Protected block are registered
          UNGUARDED by expo-router, so every new root-level route must be listed. */}
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="pet/[id]" />
        <Stack.Screen name="pet/new" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="join" />
        <Stack.Screen
          name="log"
          options={{ presentation: "transparentModal", animation: "none", contentStyle: { backgroundColor: "transparent" } }}
        />
      </Stack.Protected>
      {/* Deliberately unguarded: verify / reset-password / auth-callback cross the
          signed-out -> signed-in boundary mid-screen (verifying a code CREATES the
          session), and legal/[doc] opens from the signed-out consent footnote. */}
      <Stack.Screen name="verify" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="auth-callback" />
      <Stack.Screen name="legal/[doc]" />
    </Stack>
  );
}

function Shell() {
  const { ready } = useSession();
  const { colors, scheme } = useTheme();
  const navTheme = useNavTheme();
  const toasts = useToasts();
  const insets = useSafeAreaInsets();
  // ToastHost already pads by insets.bottom + 16; the bar sits on max(insets.bottom, 12) and is BAR_STACK tall.
  const toastOffset = Math.max(insets.bottom, 12) + BAR_STACK - (insets.bottom + 16);
  const [fontsLoaded, fontError] = useFonts({
    [fonts.regular]: Inter_400Regular,
    [fonts.medium]: Inter_500Medium,
    [fonts.semibold]: Inter_600SemiBold,
    [fonts.bold]: Inter_700Bold,
    [fonts.displaySemi]: BricolageGrotesque_600SemiBold,
    [fonts.displayBold]: BricolageGrotesque_700Bold,
    [fonts.displayXBold]: BricolageGrotesque_800ExtraBold,
  });

  // Native root view colour: shows between screens during transitions.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {
      // not supported on this platform
    });
  }, [colors.bg]);

  // A font error must not hold the splash forever: fall back to system fonts.
  const appReady = ready && (fontsLoaded || !!fontError);
  useEffect(() => {
    if (appReady) SplashScreen.hideAsync();
  }, [appReady]);

  if (!appReady) return null;
  return (
    <NavThemeProvider value={navTheme}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <RootStack />
        <InviteLinkHandler />
        <ToastHost toasts={toasts} onDismiss={dismissToast} bottomOffset={toastOffset} />
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      </View>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ThemeProvider>
          <DataProvider>
            <Shell />
          </DataProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
