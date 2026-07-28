import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from "@expo-google-fonts/inter";
import { ThemeProvider } from "@react-navigation/native";
import * as Linking from "expo-linking";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Appearance, LogBox, Platform, View } from "react-native";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import NotificationSync from "@/components/NotificationSync";
import { useNativeHeaderOptions } from "@/components/Screen";
import Toasts from "@/components/Toasts";
import { consumePendingInvite, setPendingInvite, type PendingInvite } from "@/lib/pendingInvite";
import { registerPushToken } from "@/lib/pushTokens";
import { StoreProvider, useStore } from "@/lib/store";
import { useColors, useNavTheme } from "@/lib/theme";
import { PurchasesProvider } from "@/providers/purchases";
import { SessionProvider, useSession } from "@/providers/session";

SplashScreen.preventAutoHideAsync();

// Expected in Expo Go on SDK 53+: expo-notifications warns about remote push
// support being removed, but this app only schedules local notifications.
LogBox.ignoreLogs(["expo-notifications: Android Push notifications"]);

function AppChrome() {
  const { themeMode, resolvedTheme } = useStore();
  const colors = useColors();
  // The NATIVE root view background. app.json pins userInterfaceStyle to
  // "light", so this defaults to white — and during a push/pop the navigator
  // reveals that root view for a frame beneath the incoming screen, which read
  // as a white flash every time a header button opened a pushed screen in dark
  // mode. Driving it from the live theme paints that base layer dark to match.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors.bg]);
  // THE actual fix for the push-transition flash: every NEWLY CREATED native
  // screen (react-native-screens makes a fresh one per push) starts with the
  // OS's default background for the trait collection it's born into
  // (systemBackground = white under light) for the instant before its own RN
  // content paints on top — that instant is the flash. `contentStyle`/
  // `SystemUI.setBackgroundColorAsync` only affect the persistent root/content
  // views, not this native-level default. Overriding the runtime color scheme
  // makes fresh native screens default to OUR palette instead.
  useEffect(() => {
    // react-native-web doesn't implement this (no native screens to patch
    // there anyway — the web canvas repaints from React state directly),
    // and calling it unconditionally crashed the whole app on web.
    if (Platform.OS === "web") return;
    // null = "unspecified", i.e. hand the trait collection back to the OS. In
    // "system" mode that's exactly what we want, and it's also what keeps
    // useColorScheme() reporting the DEVICE scheme rather than an override we
    // wrote ourselves (Appearance.setColorScheme populates the same cache
    // getColorScheme reads) — which is what makes System track live changes.
    Appearance.setColorScheme(themeMode === "system" ? null : themeMode);
  }, [themeMode]);
  return <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />;
}

function RootStack() {
  const nativeHeaderOptions = useNativeHeaderOptions();
  const navTheme = useNavTheme();
  const { session } = useSession();
  return (
    <ThemeProvider value={navTheme}>
      <Stack screenOptions={nativeHeaderOptions}>
        {/* Session gating lives HERE, once, for every route. Screens not
            listed inside a Protected block are auto-registered UNGUARDED by
            expo-router — every new root-level route file must be added to the
            signed-in block below (the (auth) group is the only signed-out
            surface; verify/reset-password work in both states). */}
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          <Stack.Screen name="activity" />
          <Stack.Screen name="coins" />
          <Stack.Screen name="instructions" />
          <Stack.Screen name="instructions/[id]" />
          <Stack.Screen name="join" />
          <Stack.Screen name="reminders" />
          <Stack.Screen name="pet/[id]/index" />
          <Stack.Screen name="pet/[id]/card" />
          <Stack.Screen name="pet/new" />
          <Stack.Screen name="settings/index" />
          <Stack.Screen name="settings/account" />
          <Stack.Screen name="settings/family" />
          <Stack.Screen name="settings/general" />
          <Stack.Screen name="settings/accessibility" />
          <Stack.Screen name="settings/subscription" />
          <Stack.Screen name="vets/index" />
          <Stack.Screen name="vets/[id]" />
        </Stack.Protected>
        {/* Deliberately unguarded: these three cross the signed-out →
            signed-in boundary mid-screen (verifying a signup/recovery code — or
            an emailed confirmation LINK landing on auth-callback — CREATES the
            session). Guarded either way, the flip would yank the user off the
            screen before it can route them; guarded as signed-in, a cold-start
            confirmation link would bounce to (auth) before it could verify. */}
        <Stack.Screen name="verify" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}

/**
 * Stashes invite deep links that arrive while signed out. Signed-in taps are
 * routed natively by expo-router (join is a protected route); signed-out taps
 * would bounce off the guard, so the code parks in AsyncStorage and
 * PendingInviteRunner replays it after the next sign-in. Mounted directly
 * under SessionProvider so no link event is missed while splash is up.
 */
function InboundLinkWatcher() {
  const { session, ready } = useSession();
  const authRef = useRef({ session, ready });
  authRef.current = { session, ready };
  const earlyRef = useRef<PendingInvite | null>(null);

  useEffect(() => {
    const stash = (invite: PendingInvite) => {
      if (!authRef.current.ready) {
        earlyRef.current = invite; // session restore in flight — decide once ready
        return;
      }
      if (!authRef.current.session) void setPendingInvite(invite);
    };
    const handle = (url: string | null) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      // `petpal://join?code=…` puts "join" in the URL's HOST, leaving path
      // empty — only the Expo Go shape (exp://host/--/join?code=…) fills path.
      // Checking path alone silently dropped every real-build invite link.
      const path = (parsed.path ?? "").replace(/^\/+|\/+$/g, "");
      const isJoin = path === "join" || path.endsWith("/join") || parsed.hostname === "join";
      if (!isJoin) return;
      const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
      // Kind matters: a legacy ?f= household UUID must NOT be replayed as an
      // invite code (join.tsx would reformat it into a bogus XXXX-XXXX).
      const code = first(parsed.queryParams?.code);
      const legacy = first(parsed.queryParams?.f);
      if (code) stash({ kind: "code", value: String(code) });
      else if (legacy) stash({ kind: "f", value: String(legacy) });
    };
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener("url", (e) => handle(e.url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (ready && earlyRef.current) {
      if (!session) void setPendingInvite(earlyRef.current);
      earlyRef.current = null;
    }
  }, [ready, session]);

  return null;
}

/** Replays a stashed invite once the user is signed in and hydrated. */
function PendingInviteRunner() {
  const { session } = useSession();
  const { hydrated } = useStore();
  useEffect(() => {
    if (!session || !hydrated) return;
    consumePendingInvite().then((invite) => {
      if (!invite) return;
      router.push({ pathname: "/join", params: { [invite.kind]: invite.value } });
    });
  }, [session, hydrated]);
  return null;
}

/** Registers the device's Expo push token for the signed-in user. Self-guards
 * to a no-op in Expo Go / simulators / without an EAS projectId — becomes
 * live automatically at the EAS cutover (HANDOFF step 4, now wired). */
function PushTokenRegistrar() {
  const { session } = useSession();
  const uid = session?.user?.id ?? null;
  useEffect(() => {
    if (uid) registerPushToken(uid).catch((e) => console.warn("[petpal] push token registration failed:", e));
  }, [uid]);
  return null;
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
      <PendingInviteRunner />
      <PushTokenRegistrar />
      <AppChrome />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <SessionProvider>
          <InboundLinkWatcher />
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
