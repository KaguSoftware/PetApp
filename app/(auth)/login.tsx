import { Link, router } from "expo-router";
import BrandMark from "@/components/BrandMark";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AuthProviderButtons from "@/components/AuthProviderButtons";
import { AccentButton, TextField } from "@/components/ui";
import { resendCode, signInWithEmail } from "@/lib/auth";
import { font, useColors, type Colors } from "@/lib/theme";

export default function LoginScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    // The keyboard's return key (onSubmitEditing) calls this directly, bypassing
    // the button's disabled-while-loading guard — without this a second Enter
    // fires a duplicate auth request mid-flight.
    if (loading) return;
    setError(null);
    setLoading(true);
    const { error, needsVerification } = await signInWithEmail(email, password);
    // The account exists and the password is right — it was just never
    // confirmed. Send a fresh code and hand the user to the code screen instead
    // of an error they can't act on. (A resend failure, e.g. the hourly SMTP
    // rate limit, is not fatal: /verify has its own Resend button.)
    if (needsVerification) {
      await resendCode(email, "signup");
      setLoading(false);
      router.push({ pathname: "/verify", params: { email: email.trim(), purpose: "signup" } });
      return;
    }
    setLoading(false);
    if (error) setError(error);
    // On success the session listener redirects to (tabs).
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        // The form is centred in a flexGrow:1 container, so it fits the screen
        // until the keyboard is up. Don't let it rubber-band as if there were
        // more below.
        alwaysBounceVertical={false}
      >
        <View style={styles.header}>
          <BrandMark />
          <Text style={styles.subtitle}>Care for your pets, together</Text>
        </View>
        <View style={styles.form}>
          <TextField
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <TextField
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            onSubmitEditing={handleSubmit}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AccentButton onPress={handleSubmit} loading={loading} disabled={!email || !password}>Log in</AccentButton>
          <Link
            href={{ pathname: "/(auth)/forgot", params: email ? { email } : undefined }}
            style={styles.forgotLink}
          >
            Forgot password?
          </Link>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>or</Text>
            <View style={styles.dividerLine} />
          </View>
          <AuthProviderButtons onError={setError} disabled={loading} />
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>New to PetPal? </Text>
          <Link href="/(auth)/signup" style={styles.footerLink}>
            Create an account
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24 },
  header: { alignItems: "center", marginBottom: 40 },
  subtitle: { marginTop: 6, fontSize: 15, fontFamily: font.regular, color: colors.label2 },
  form: { gap: 12 },
  error: { color: colors.red, fontSize: 14, fontFamily: font.medium, textAlign: "left", paddingHorizontal: 4 },
  forgotLink: {
    fontSize: 14,
    fontFamily: font.semibold,
    color: colors.accent,
    textAlign: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.sep },
  dividerLabel: { fontSize: 13, fontFamily: font.medium, color: colors.label3 },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 12 },
  footerText: { fontSize: 15, fontFamily: font.regular, color: colors.label2 },
  // Padding lifts the link's tap target to >=44pt without shifting the baseline row.
  footerLink: { fontSize: 15, fontFamily: font.semibold, color: colors.accent, paddingVertical: 14, paddingHorizontal: 8 },
});
