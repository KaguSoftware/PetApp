import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { ErrorText } from "@/components/auth/AuthBits";
import { requestPasswordReset } from "@/lib/auth";
import { PillButton, TextField } from "@/ui";

export default function ForgotPasswordScreen() {
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
    <AuthFrame
      title="Forgot password?"
      subtitle="Enter your account email and we'll send a 6-digit code to reset it."
      badge={{ icon: "note", tone: "ice" }}
    >
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
      <ErrorText message={error} />
      <PillButton label="Send code" onPress={handleSubmit} loading={loading} disabled={!email.trim()} />
    </AuthFrame>
  );
}
