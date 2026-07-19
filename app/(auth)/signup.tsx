import { Link } from "expo-router";
import BrandMark from "@/components/BrandMark";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AccentButton, TextField } from "@/components/ui";
import { friendlyAuthError } from "@/lib/authErrors";
import { supabase } from "@/lib/supabase";
import { colors, font } from "@/lib/theme";

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  async function handleSubmit() {
    // See login.tsx — onSubmitEditing bypasses the button's loading guard, and
    // a duplicate signUp surfaces a spurious "already registered" error over a
    // successful signup.
    if (loading) return;
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name || "You" } },
    });
    setLoading(false);
    if (error) {
      setError(friendlyAuthError(error.message));
      return;
    }
    // With a session the auth listener redirects to (tabs); otherwise email
    // confirmation is required first (link currently lands on the web demo).
    if (!data.session) setConfirmSent(true);
  }

  if (confirmSent) {
    // Scrollable + safe-area inset: "Back to log in" is the ONLY exit from this
    // state, so at large text sizes it must never end up off-screen.
    return (
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.confirmWrap, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
      >
        <Text style={styles.confirmTitle}>Check your email</Text>
        <Text style={styles.confirmBody}>We sent a confirmation link to {email}. Confirm it, then log in.</Text>
        <Link href="/(auth)/login" style={styles.footerLink}>
          Back to log in
        </Link>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <BrandMark />
          <Text style={styles.subtitle}>Create your household</Text>
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

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24 },
  header: { alignItems: "center", marginBottom: 40 },
  subtitle: { marginTop: 6, fontSize: 15, fontFamily: font.regular, color: colors.label2 },
  form: { gap: 12 },
  error: { color: colors.red, fontSize: 14, fontFamily: font.medium, textAlign: "left", paddingHorizontal: 4 },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 12 },
  footerText: { fontSize: 15, fontFamily: font.regular, color: colors.label2 },
  // Padding lifts the link's tap target to >=44pt without shifting the baseline row.
  footerLink: { fontSize: 15, fontFamily: font.semibold, color: colors.accent, textAlign: "center", paddingVertical: 14, paddingHorizontal: 8 },
  // flexGrow keeps the content vertically centred when it's shorter than the
  // screen, while still allowing it to scroll once it outgrows it.
  confirmWrap: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 },
  confirmTitle: { fontSize: 18, fontFamily: font.semibold, color: colors.label },
  confirmBody: { fontSize: 15, fontFamily: font.regular, color: colors.label2, textAlign: "center" },
});
