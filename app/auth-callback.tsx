import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { completeEmailLink } from "@/lib/auth";
import { useColors } from "@/lib/theme";
import { useSession } from "@/providers/session";

/**
 * Landing pad for every auth redirect — OAuth (petpal://auth-callback?code=…)
 * AND the links inside Supabase's confirmation / recovery / email-change
 * emails (?token_hash=…&type=…).
 *
 * OAuth normally completes inside lib/auth.ts before the OS even routes here,
 * so this screen usually has nothing to do but redirect. Email links have no
 * such in-flight handler: the app may be COLD-STARTED by the tap, so the
 * verification has to happen right here.
 *
 * Deliberately OUTSIDE the root session guards (see app/_layout.tsx): a
 * confirmation link arrives with no session yet, and a guarded route would
 * bounce it to (auth) before this could run.
 */
export default function AuthCallback() {
  const colors = useColors();
  const { session, ready } = useSession();
  // Warm deep links land on useURL; on a cold start it's still null for the
  // first render(s), so getInitialURL() is awaited as the authoritative source
  // before giving up — reading useURL alone would redirect away from a
  // perfectly good confirmation link.
  const url = Linking.useURL();
  // One shot: verifying creates a session, which re-renders this screen.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || !ready) return;
    handled.current = true;

    (async () => {
      const opened = url ?? (await Linking.getInitialURL());
      if (!opened) {
        router.replace(session ? "/home" : "/(auth)/welcome");
        return;
      }
      const { error, purpose, ignored } = await completeEmailLink(opened, !!session);

      if (error) {
        // Never dead-end: hand the user to the code screen, where they can type
        // the 6-digit code from the same email or request a fresh one.
        router.replace({ pathname: "/verify", params: { purpose, error } });
        return;
      }
      if (purpose === "recovery" && !ignored) {
        router.replace("/reset-password");
        return;
      }
      router.replace("/home");
    })();
  }, [url, ready, session]);

  return (
    <View style={[styles.center, { backgroundColor: colors.bg }]}>
      <ActivityIndicator color={colors.label2} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
