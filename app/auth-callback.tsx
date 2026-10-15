import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useSession } from "@/data";
import { completeEmailLink } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/ui";

/**
 * Landing pad for every auth redirect: OAuth (peting://auth-callback?code=…)
 * AND the links inside Supabase's confirmation / recovery / email-change
 * emails (?token_hash=…&type=…).
 *
 * OAuth normally completes inside lib/auth.ts before the OS routes here, so
 * this usually only redirects. Email links have no in-flight handler (the app
 * may be COLD-STARTED by the tap), so verification happens right here.
 *
 * Deliberately OUTSIDE the root session guards: a confirmation link arrives
 * with no session yet, and a guarded route would bounce it to (auth) first.
 */
export default function AuthCallback() {
  const { colors } = useTheme();
  const { session, ready } = useSession();
  // Warm links land on useURL; on a cold start it is null for the first
  // render(s), so getInitialURL() is awaited as the authoritative source.
  const url = Linking.useURL();
  // One shot: verifying creates a session, which re-renders this screen.
  const handled = useRef(false);
  // Set once the link is done; Home is entered from an effect so the root guards have the session first.
  const [goHome, setGoHome] = useState(false);

  useEffect(() => {
    if (goHome && session) router.replace("/home");
  }, [goHome, session]);

  useEffect(() => {
    if (handled.current || !ready) return;
    handled.current = true;

    (async () => {
      const opened = url ?? (await Linking.getInitialURL());
      if (!opened) {
        router.replace(session ? "/home" : "/(auth)/welcome");
        return;
      }
      // A bare ?code= is usually the in-app OAuth round trip, which may already be exchanging it:
      // give that up to ~2s to produce a session before spending the one-time code here.
      let signedIn = !!session;
      if (!signedIn && /[?&]code=/.test(opened) && !/[?&]token_hash=/.test(opened)) {
        for (let i = 0; i < 8 && !signedIn; i++) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          signedIn = !!(await supabase.auth.getSession()).data.session;
        }
      }
      const { error, purpose, ignored } = await completeEmailLink(opened, signedIn);

      if (error) {
        // Never dead-end: hand over to the code screen, where the user can type
        // the 6-digit code from the same email or request a fresh one.
        router.replace({ pathname: "/verify", params: { purpose, error } });
        return;
      }
      if (purpose === "recovery" && !ignored) {
        router.replace("/reset-password");
        return;
      }
      if (ignored && !signedIn) {
        router.replace("/(auth)/welcome");
        return;
      }
      setGoHome(true);
    })();
  }, [url, ready, session]);

  return (
    <View style={[styles.center, { backgroundColor: colors.bg }]}>
      <ActivityIndicator color={colors.ink2} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
