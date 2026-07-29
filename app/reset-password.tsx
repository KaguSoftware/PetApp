import { Redirect, router } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { AccentButton, TextField } from "@/components/ui";
import { friendlyAuthError } from "@/lib/authErrors";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { font, useColors, type Colors } from "@/lib/theme";
import { useSession } from "@/providers/session";

/**
 * Final step of password recovery: the OTP on /verify already created a
 * session, so this is a plain authenticated password update. Unguarded route
 * (see root layout) — self-guards instead.
 */
export default function ResetPasswordScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { session, ready } = useSession();
  const { toast } = useStore();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (ready && !session) return <Redirect href="/(auth)/welcome" />;

  const valid = password.length >= 6 && password === confirm;

  async function handleSubmit() {
    if (loading || !valid) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(friendlyAuthError(error.message));
      return;
    }
    toast("check", "Password updated", "You're signed in");
    router.replace("/home");
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" alwaysBounceVertical={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose a new password</Text>
          <Text style={styles.subtitle}>At least 6 characters. You{"'"}ll stay signed in on this device.</Text>
        </View>
        <View style={styles.form}>
          <TextField
            placeholder="New password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="newPassword"
            autoFocus
          />
          <TextField
            placeholder="Confirm new password"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            textContentType="newPassword"
            onSubmitEditing={handleSubmit}
          />
          {password.length > 0 && password.length < 6 ? (
            <Text style={styles.hint}>Passwords need at least 6 characters.</Text>
          ) : confirm.length > 0 && password !== confirm ? (
            <Text style={styles.hint}>Those don{"'"}t match yet.</Text>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AccentButton onPress={handleSubmit} loading={loading} disabled={!valid}>
            Save new password
          </AccentButton>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    container: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingBottom: 24 },
    header: { marginBottom: 24, gap: 6 },
    title: { fontSize: 22, fontFamily: font.bold, color: colors.label, letterSpacing: -0.4 },
    subtitle: { fontSize: 15, fontFamily: font.regular, color: colors.label2, lineHeight: 21 },
    form: { gap: 12 },
    hint: { color: colors.label3, fontSize: 13, fontFamily: font.medium, paddingHorizontal: 4 },
    error: { color: colors.red, fontSize: 14, fontFamily: font.medium, paddingHorizontal: 4 },
  });
