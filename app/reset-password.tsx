import { Redirect, router } from "expo-router";
import { useState } from "react";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { ErrorText } from "@/components/auth/AuthBits";
import { showToast, useSession } from "@/data";
import { friendlyAuthError } from "@/lib/authErrors";
import { supabase } from "@/lib/supabase";
import { PillButton, Text, TextField } from "@/ui";

/**
 * Final step of password recovery: the OTP on /verify already created a
 * session, so this is a plain authenticated password update. The route is
 * unguarded (see root layout), so it guards itself.
 */
export default function ResetPasswordScreen() {
  const { session, ready } = useSession();
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
    showToast({ kind: "info", text: "Password updated. You're signed in." });
    router.replace("/home");
  }

  return (
    <AuthFrame
      title="New password"
      subtitle="At least 6 characters. You'll stay signed in on this device."
      badge={{ icon: "check", tone: "mint" }}
    >
      <TextField placeholder="New password" value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" autoFocus />
      <TextField
        placeholder="Confirm new password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        textContentType="newPassword"
        onSubmitEditing={handleSubmit}
      />
      {password.length > 0 && password.length < 6 ? (
        <Text variant="small" tone="ink3">
          Passwords need at least 6 characters.
        </Text>
      ) : confirm.length > 0 && password !== confirm ? (
        <Text variant="small" tone="ink3">
          Those don{"'"}t match yet.
        </Text>
      ) : null}
      <ErrorText message={error} />
      <PillButton label="Save new password" onPress={handleSubmit} loading={loading} disabled={!valid} />
    </AuthFrame>
  );
}
