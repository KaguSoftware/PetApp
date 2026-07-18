import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AccentButton, Field } from "@/components/auth-ui";
import { friendlyAuthError } from "@/lib/authErrors";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

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
          <Text style={styles.brand}>PetPal</Text>
          <Text style={styles.subtitle}>Care for your pets, together</Text>
        </View>
        <View style={styles.form}>
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
            textContentType="password"
            onSubmitEditing={handleSubmit}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AccentButton label="Log in" onPress={handleSubmit} loading={loading} disabled={!email || !password} />
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
  brand: { fontSize: 34, fontFamily: "Inter_700Bold", color: colors.label, letterSpacing: -0.5 },
  subtitle: { marginTop: 6, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.label2 },
  form: { gap: 12 },
  error: { color: colors.red, fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  footerText: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.label2 },
  footerLink: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.accent },
});
