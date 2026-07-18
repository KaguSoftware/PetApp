import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabaseEnv = Boolean(url && anonKey);

// Shared backend with the PetPal web demo — same project, same schema, same
// RLS. Sessions persist in AsyncStorage; there is no URL-based session
// detection on native (email links land on the web demo during development).
export const supabase = createClient(url ?? "https://missing.supabase.co", anonKey ?? "missing", {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Supabase recommends pausing token auto-refresh while the app is backgrounded.
AppState.addEventListener("change", (state) => {
  if (state === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
