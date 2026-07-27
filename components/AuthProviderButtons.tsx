import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { PressableScale } from "@/components/ui";
import { isAppleSignInAvailable, signInWithApple, signInWithGoogle } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { font, radius, useColors, type Colors } from "@/lib/theme";

// Lets the OS hand the OAuth redirect back to a still-open auth session
// (no-op on native cold paths, required on web/Android edge cases).
WebBrowser.maybeCompleteAuthSession();

/**
 * The provider sign-in stack: native Apple button (iOS, HIG-compliant) over a
 * Google button in the app's own control vocabulary. Both flows resolve
 * through lib/auth.ts — on success the session listener does the navigation,
 * so this component only surfaces errors upward.
 *
 * SCOPE(EAS cutover): signInWithGoogle() swaps to the native one-tap sheet
 * behind the same lib/auth.ts call — this component doesn't change.
 */
export default function AuthProviderButtons({
  onError,
  disabled,
}: {
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const colors = useColors();
  const { resolvedTheme } = useStore();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [busy, setBusy] = useState<"apple" | "google" | null>(null);

  useEffect(() => {
    let alive = true;
    if (Platform.OS === "ios") {
      isAppleSignInAvailable().then((ok) => {
        if (alive) setAppleAvailable(ok);
      });
    }
    return () => {
      alive = false;
    };
  }, []);

  async function handleApple() {
    if (busy || disabled) return;
    setBusy("apple");
    const { error } = await signInWithApple();
    setBusy(null);
    if (error) onError(error);
  }

  async function handleGoogle() {
    if (busy || disabled) return;
    setBusy("google");
    const { error } = await signInWithGoogle();
    setBusy(null);
    if (error) onError(error);
  }

  return (
    <View style={styles.stack}>
      {appleAvailable ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={
            resolvedTheme === "dark"
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={radius.lg}
          style={styles.appleButton}
          onPress={handleApple}
        />
      ) : null}
      <PressableScale
        onPress={handleGoogle}
        disabled={disabled || busy !== null}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        accessibilityState={{ disabled: disabled || busy !== null, busy: busy === "google" }}
      >
        <View style={styles.googleButton}>
          {busy === "google" ? (
            <ActivityIndicator color={colors.label} />
          ) : (
            <>
              <GoogleLogo />
              <Text style={styles.googleLabel}>Continue with Google</Text>
            </>
          )}
        </View>
      </PressableScale>
    </View>
  );
}

function GoogleLogo() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    stack: { gap: 10 },
    appleButton: { height: 48, width: "100%" },
    googleButton: {
      minHeight: 48,
      borderRadius: radius.lg,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.sep,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingHorizontal: 16,
    },
    googleLabel: { fontSize: 16, fontFamily: font.semibold, color: colors.label },
  });
