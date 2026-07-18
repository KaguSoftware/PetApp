import { Link } from "expo-router";
import BrandMark from "@/components/BrandMark";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AccentButton, TextField } from "@/components/ui";
import { friendlyAuthError } from "@/lib/authErrors";
import { supabase } from "@/lib/supabase";
import { colors, font } from "@/lib/theme";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) setError(friendlyAuthError(error.message));
    // On success the session listener redirects to (tabs).
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
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
  footerLink: { fontSize: 15, fontFamily: font.semibold, color: colors.accent, paddingVertical: 14, paddingHorizontal: 8 },
});
