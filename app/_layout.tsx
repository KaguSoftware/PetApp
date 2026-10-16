import { DefaultTheme, DarkTheme, ThemeProvider as NavThemeProvider, type Theme } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { InviteLinkHandler } from "@/components/onboarding/InviteLinkHandler";
import { DataProvider, dismissToast, useSession, useToasts } from "@/data";
import { ThemeProvider, ToastHost, useTheme } from "@/ui";

SplashScreen.preventAutoHideAsync();

/** Lift toasts above the native tab bar (ToastHost already adds the bottom inset). */
const TOAST_OFFSET = 56;


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

  // Native root view colour: shows between screens during transitions.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {
      // not supported on this platform
    });
  }, [colors.bg]);

  
  const appReady = ready;
  useEffect(() => {
    if (appReady) SplashScreen.hideAsync();
  }, [appReady]);

  if (!appReady) return null;
  return (
    <NavThemeProvider value={navTheme}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <RootStack />
        <InviteLinkHandler />
        <ToastHost toasts={toasts} onDismiss={dismissToast} bottomOffset={TOAST_OFFSET} />
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
