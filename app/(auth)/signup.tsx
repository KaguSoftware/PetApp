import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AccentButton, Field } from "@/components/auth-ui";
import { friendlyAuthError } from "@/lib/authErrors";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  async function handleSubmit() {
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
    return (
      <View style={[styles.flex, styles.confirmWrap]}>
        <Text style={styles.confirmTitle}>Check your email</Text>
        <Text style={styles.confirmBody}>We sent a confirmation link to {email}. Confirm it, then log in.</Text>
        <Link href="/(auth)/login" style={styles.footerLink}>
          Back to log in
        </Link>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.brand}>PetPal</Text>
          <Text style={styles.subtitle}>Create your household</Text>
        </View>
        <View style={styles.form}>
          <Field placeholder="Your name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
          <Field
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <Field
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="newPassword"
            onSubmitEditing={handleSubmit}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AccentButton label="Create account" onPress={handleSubmit} loading={loading} disabled={!email || !password} />
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
  brand: { fontSize: 34, fontFamily: "Inter_700Bold", color: colors.label, letterSpacing: -0.5 },
  subtitle: { marginTop: 6, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.label2 },
  form: { gap: 12 },
  error: { color: colors.red, fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  footerText: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.label2 },
  footerLink: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.accent, textAlign: "center" },
  confirmWrap: { alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 },
  confirmTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.label },
  confirmBody: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.label2, textAlign: "center" },
});
