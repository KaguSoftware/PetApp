import { router } from "expo-router";
import { useState } from "react";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { AuthLink, ErrorText, OrDivider } from "@/components/auth/AuthBits";
import { AuthProviderButtons } from "@/components/auth/AuthProviderButtons";
import { resendCode, signInWithEmail } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { PillButton, TextField } from "@/ui";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    // The keyboard's return key bypasses the button's disabled-while-loading
    // guard; without this a second Enter fires a duplicate auth request.
    if (loading) return;
    setError(null);
    setLoading(true);
    const { error, needsVerification } = await signInWithEmail(email, password);
    // Account exists and the password is right, it was just never confirmed:
    // send a fresh code and hand over to the code screen instead of a dead-end
    // error. (A resend failure is not fatal: /verify has its own Resend button.)
    if (needsVerification) {
      await resendCode(email, "signup");
      setLoading(false);
      router.push({ pathname: "/verify", params: { email: email.trim(), purpose: "signup" } });
      return;
    }
    setLoading(false);
    if (error) setError(error);
    // On success the session listener swaps in the app.
  }

  return (
    <AuthFrame
      title="Welcome back"
      subtitle={`Log in to ${BRAND}`}
      badge={{ icon: "heart", tone: "pink" }}
      footer={<AuthLink prefix={`New to ${BRAND}?`} label="Create an account" onPress={() => router.replace("/(auth)/signup")} />}
    >
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
      <ErrorText message={error} />
      <PillButton label="Log in" onPress={handleSubmit} loading={loading} disabled={!email || !password} />
      <AuthLink
        label="Forgot password?"
        onPress={() => router.push({ pathname: "/(auth)/forgot", params: email ? { email } : undefined })}
      />
      <OrDivider />
      <AuthProviderButtons onError={setError} disabled={loading} />
    </AuthFrame>
  );
}
