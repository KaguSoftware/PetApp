import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { isAppleSignInAvailable, signInWithApple, signInWithGoogle } from "@/lib/auth";
import { PressableScale, Text, borderWidth, radius, spacing, useTheme } from "@/ui";

// Lets the OS hand the OAuth redirect back to a still-open auth session.
WebBrowser.maybeCompleteAuthSession();

/**
 * Native Apple button (iOS, HIG-compliant) over a Google pill (the "G" keeps its official colors, a brand requirement). Both resolve
 * through lib/auth.ts; on success the session listener navigates, so this only
 * surfaces errors upward.
 */
export function AuthProviderButtons({ onError, disabled }: { onError: (message: string) => void; disabled?: boolean }) {
  const { colors, scheme } = useTheme();
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

  async function run(provider: "apple" | "google") {
    if (busy || disabled) return;
    setBusy(provider);
    const { error } = provider === "apple" ? await signInWithApple() : await signInWithGoogle();
    setBusy(null);
    if (error) onError(error);
  }

  return (
    <View style={styles.stack}>
      {appleAvailable ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={
            scheme === "dark"
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={26}
          style={styles.apple}
          onPress={() => run("apple")}
        />
      ) : null}
      <PressableScale
        onPress={() => run("google")}
        disabled={disabled || busy !== null}
        haptic="tap"
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        accessibilityState={{ disabled: disabled || busy !== null, busy: busy === "google" }}
        style={[styles.google, { backgroundColor: colors.bg, borderColor: colors.ink3 }]}
      >
        {busy === "google" ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <>
            <GoogleLogo />
            <Text variant="headline" style={styles.googleLabel}>
              Continue with Google
            </Text>
          </>
        )}
      </PressableScale>
    </View>
  );
}

function GoogleLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
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

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  apple: { height: 52, width: "100%" },
  google: {
    height: 52,
    borderRadius: radius.pill,
    borderWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  googleLabel: { fontSize: 17 },
});
