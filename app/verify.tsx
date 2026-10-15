import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { ErrorText } from "@/components/auth/AuthBits";
import { CODE_LENGTH, CodeInput } from "@/components/auth/CodeInput";
import { useSession } from "@/data";
import { resendCode, verifyEmailOtp, type OtpPurpose } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PillButton, Text, TextField } from "@/ui";

const RESEND_COOLDOWN_S = 60;

/**
 * Six-digit email code entry: signup confirmation, password recovery and email
 * change all land here (purpose param). Deliberately OUTSIDE the root session
 * guards: verifying a code CREATES the session mid-screen, and a guarded route
 * would yank the user away before this screen can route them on.
 *
 * Secure email change sends codes to BOTH addresses; `secondary` carries the
 * old address so either code works here, one after the other.
 */
export default function VerifyScreen() {
  const params = useLocalSearchParams<{ email?: string; purpose?: string; secondary?: string; error?: string }>();
  // A failed email LINK bounces here from auth-callback WITHOUT an address (the
  // link carries none), so the field below lets the user supply it.
  const [emailInput, setEmailInput] = useState((params.email ?? "").trim());
  const email = emailInput.trim();
  const needsEmail = !(params.email ?? "").trim();
  const purpose = (["signup", "recovery", "email_change"].includes(params.purpose ?? "")
    ? params.purpose
    : "signup") as OtpPurpose;
  const secondary = (params.secondary ?? "").trim();

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>((params.error ?? "").trim() || null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  // Secure email change: the first code landed, the sibling one is still due.
  const [awaitingSecond, setAwaitingSecond] = useState(false);
  const { session } = useSession();
  // Signup verified: leave for Home only once the session has reached the root guards.
  const [verified, setVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const resendBusy = useRef(false);

  useEffect(() => {
    if (verified && session) router.replace("/home");
  }, [verified, session]);

  // Already signed in and nothing to verify (e.g. an old link or a stale screen): go Home.
  const hasPurpose = !!(params.purpose ?? "").trim();
  useEffect(() => {
    if (session && !hasPurpose && !params.error && !verified && !awaitingSecond) router.replace("/home");
  }, [session, hasPurpose, params.error, verified, awaitingSecond]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function submit(value: string) {
    if (busy || value.length !== CODE_LENGTH) return;
    if (!email) {
      setError("Enter the email address you signed up with.");
      return;
    }
    setBusy(true);
    setError(null);

    // For email changes the code may belong to the other address; the token only
    // matches one, so the second attempt is safe.
    let result = await verifyEmailOtp(email, value, purpose);
    if (result.error && purpose === "email_change" && secondary) {
      const second = await verifyEmailOtp(secondary, value, purpose);
      if (!second.error) result = second;
    }

    if (result.error) {
      setBusy(false);
      setError(result.error);
      setCode("");
      return;
    }

    if (purpose === "recovery") {
      setBusy(false);
      router.replace("/reset-password");
      return;
    }
    if (purpose === "email_change") {
      // With Secure Email Change the switch completes only after BOTH codes.
      const { data } = await supabase.auth.getUser();
      setBusy(false);
      if (data.user?.new_email) {
        setAwaitingSecond(true);
        setCode("");
        return;
      }
      router.back();
      return;
    }
    // Signup: the session now exists; the effect above navigates once the root guards have re-rendered.
    setBusy(false);
    setVerified(true);
  }

  async function handleResend() {
    if (cooldown > 0 || busy || resendBusy.current) return;
    if (!email) {
      setError("Enter the email address you signed up with.");
      return;
    }
    resendBusy.current = true;
    setResending(true);
    setError(null);
    try {
      const { error } = await resendCode(email, purpose);
      if (error) {
        setError(error);
        return;
      }
      setCooldown(RESEND_COOLDOWN_S);
    } finally {
      resendBusy.current = false;
      setResending(false);
    }
  }

  const title = purpose === "recovery" ? "Reset your password" : awaitingSecond ? "One more code" : "Enter the code";
  const subtitle = needsEmail
    ? `Enter your email address and the ${CODE_LENGTH}-digit code we sent you.`
    : purpose === "email_change"
      ? awaitingSecond
        ? "Almost there: enter the code we sent to your other address to confirm the change."
        : `We sent codes to ${email}${secondary ? ` and ${secondary}` : ""}. Enter either one to start.`
      : `We emailed a ${CODE_LENGTH}-digit code to ${email}.`;

  return (
    <AuthFrame title={title} subtitle={subtitle} badge={{ icon: "note", tone: "mint" }}>
      {needsEmail ? (
        <TextField
          placeholder="Email"
          value={emailInput}
          onChangeText={(t) => {
            setEmailInput(t);
            setError(null);
          }}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
      ) : null}
      <CodeInput
        value={code}
        onChange={(d) => {
          setCode(d);
          setError(null);
        }}
        onComplete={submit}
        // When the address still has to be typed, that field goes first.
        autoFocus={!needsEmail}
      />
      <ErrorText message={error} />
      <PillButton label="Verify" onPress={() => submit(code)} loading={busy} disabled={code.length !== CODE_LENGTH || !email} />
      <PillButton
        label={cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        variant="secondary"
        onPress={handleResend}
        disabled={cooldown > 0}
        loading={resending}
      />
      <Text variant="small" tone="ink3" style={{ textAlign: "center" }}>
        No code in the email? Older emails may only carry a link. Resend to get a code.
      </Text>
    </AuthFrame>
  );
}
