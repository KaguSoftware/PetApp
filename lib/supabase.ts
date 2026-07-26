import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabaseEnv = Boolean(url && anonKey);

// Storage for the persisted auth session. On native this is AsyncStorage. On
// web the page is server-rendered (web.output: "static"), so AsyncStorage —
// which touches `window` — throws during the Node SSR pass. Guard on the
// presence of `window`: during SSR we hand Supabase `undefined` so it falls
// back to in-memory storage, and in the browser we use AsyncStorage's
// localStorage-backed web implementation.
const isServer = typeof window === "undefined";
const authStorage = Platform.OS === "web" && isServer ? undefined : AsyncStorage;

// Shared backend with the PetPal web demo — same project, same schema, same
// RLS. Sessions persist in AsyncStorage; there is no URL-based session
// detection on native (email links land on the web demo during development).
export const supabase = createClient(url ?? "https://missing.supabase.co", anonKey ?? "missing", {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    // Don't persist during SSR — there's no durable store on the server.
    persistSession: !isServer,
    detectSessionInUrl: false,
    // PKCE: the browser-based OAuth flow (Google) returns a one-time ?code=
    // that lib/auth.ts exchanges via exchangeCodeForSession. Password grant,
    // signInWithIdToken (Apple) and OTP verification are unaffected.
    flowType: "pkce",
  },
  // Realtime (lib/store.tsx subscribes per household). The 10/s ceiling is the
  // client default, stated explicitly so it's tunable in one place.
  //
  // NOTE: supabase-js pushes each refreshed JWT to every joined channel itself
  // (_handleTokenChanged on SIGNED_IN / TOKEN_REFRESHED / SIGNED_OUT). Do NOT
  // add a second auth listener that calls realtime.setAuth — it races the
  // built-in one.
  realtime: { params: { eventsPerSecond: 10 } },
});

// Supabase recommends pausing token auto-refresh while the app is backgrounded.
AppState.addEventListener("change", (state) => {
  if (state === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
