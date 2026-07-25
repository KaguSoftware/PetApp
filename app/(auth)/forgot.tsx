import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AccentButton, TextField } from "@/components/ui";
import { requestPasswordReset } from "@/lib/auth";
import { font, useColors, type Colors } from "@/lib/theme";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (loading || !email.trim()) return;
    setError(null);
    setLoading(true);
    const { error } = await requestPasswordReset(email);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    router.push({ pathname: "/verify", params: { email: email.trim(), purpose: "recovery" } });
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Forgot your password?</Text>
          <Text style={styles.subtitle}>
            Enter your account email and we{"'"}ll send a 6-digit code to reset it.
          </Text>
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
            onSubmitEditing={handleSubmit}
            autoFocus
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AccentButton onPress={handleSubmit} loading={loading} disabled={!email.trim()}>
            Send code
          </AccentButton>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    container: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24 },
    header: { marginBottom: 24, gap: 6 },
    title: { fontSize: 22, fontFamily: font.bold, color: colors.label, letterSpacing: -0.4 },
    subtitle: { fontSize: 15, fontFamily: font.regular, color: colors.label2, lineHeight: 21 },
    form: { gap: 12 },
    error: { color: colors.red, fontSize: 14, fontFamily: font.medium, paddingHorizontal: 4 },
  });
