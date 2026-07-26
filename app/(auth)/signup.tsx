import { Link, router } from "expo-router";
import BrandMark from "@/components/BrandMark";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AuthProviderButtons from "@/components/AuthProviderButtons";
import { AccentButton, TextField } from "@/components/ui";
import { signUpWithEmail } from "@/lib/auth";
import { font, useColors, type Colors } from "@/lib/theme";

// Deliberately loose — the confirmation email is the real validator; this only
// catches missing @ / domain typos before the network round-trip.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6; // Supabase's default minimum.

export default function SignupScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    // See login.tsx — onSubmitEditing bypasses the button's loading guard, and
    // a duplicate signUp surfaces a spurious "already registered" error over a
    // successful signup.
    if (loading) return;
    // Catch the obvious typos locally — a network round-trip just to be told
    // "invalid email" wastes the user's time, and (with confirmations on) a
    // mistyped address silently sends the code somewhere they can't read.
    if (!EMAIL_RE.test(email.trim())) {
      setError("That doesn't look like a valid email address.");
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(`Please use a longer password (at least ${MIN_PASSWORD} characters).`);
      return;
    }
    setError(null);
    setLoading(true);
    const { error, needsVerification } = await signUpWithEmail(name, email, password);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    // With a session the auth listener redirects to (tabs); otherwise the user
    // types the 6-digit code from the confirmation email into /verify.
    if (needsVerification) {
      router.push({ pathname: "/verify", params: { email: email.trim(), purpose: "signup" } });
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <BrandMark />
          <Text style={styles.subtitle}>Your family{"'"}s pet care, in one place</Text>
        </View>
        <View style={styles.form}>
          <TextField placeholder="Your name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
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
            textContentType="newPassword"
            onSubmitEditing={handleSubmit}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AccentButton onPress={handleSubmit} loading={loading} disabled={!email || !password}>Create account</AccentButton>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>or</Text>
            <View style={styles.dividerLine} />
          </View>
          <AuthProviderButtons onError={setError} disabled={loading} />
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" style={styles.footerLink}>
            Log in
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
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.sep },
  dividerLabel: { fontSize: 13, fontFamily: font.medium, color: colors.label3 },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 12 },
  footerText: { fontSize: 15, fontFamily: font.regular, color: colors.label2 },
  // Padding lifts the link's tap target to >=44pt without shifting the baseline row.
  footerLink: { fontSize: 15, fontFamily: font.semibold, color: colors.accent, textAlign: "center", paddingVertical: 14, paddingHorizontal: 8 },
});
