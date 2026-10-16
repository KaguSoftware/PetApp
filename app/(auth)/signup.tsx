import { router } from "expo-router";
import { useState } from "react";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { AuthLink, ErrorText, OrDivider } from "@/components/auth/AuthBits";
import { AuthProviderButtons } from "@/components/auth/AuthProviderButtons";
import { LegalFootnote } from "@/components/auth/LegalFootnote";
import { signUpWithEmail } from "@/lib/auth";
import { PillButton, TextField } from "@/ui";

// Deliberately loose: the confirmation email is the real validator; this only
// catches a missing @ / domain before the network round-trip.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6; // Supabase's default minimum.

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    // See login.tsx: a duplicate signUp surfaces a spurious "already registered"
    // error over a successful signup.
    if (loading) return;
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
    // With a session the root guard swaps in the app; otherwise the user types
    // the 6-digit code from the confirmation email.
    if (needsVerification) {
      router.push({ pathname: "/verify", params: { email: email.trim(), purpose: "signup" } });
    }
  }

  return (
    <AuthFrame
      title="Let's get started"
      subtitle="Create your account to look after your pet together."
      footer={
        <>
          <AuthLink prefix="Already have an account?" label="Log in" onPress={() => router.replace("/(auth)/login")} />
          <LegalFootnote />
        </>
      }
    >
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
      <ErrorText message={error} />
      <PillButton label="Create account" onPress={handleSubmit} loading={loading} disabled={!email || !password} />
      <OrDivider />
      <AuthProviderButtons onError={setError} disabled={loading} />
    </AuthFrame>
  );
}
