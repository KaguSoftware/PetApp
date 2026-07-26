import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AccentButton, TextField } from "@/components/ui";
import { resendCode, verifyEmailOtp, type OtpPurpose } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { font, radius, useColors, type Colors } from "@/lib/theme";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_S = 60;

/**
 * Six-digit email code entry — signup confirmation, password recovery, and
 * email change all land here (purpose param). Deliberately OUTSIDE the root
 * session guards: verifying a signup/recovery code CREATES the session
 * mid-screen, and a guarded route would yank the user away before this screen
 * can route them to the right place.
 *
 * Secure email change sends codes to BOTH addresses; `secondary` carries the
 * old address so either code works here, one after the other.
 */
export default function VerifyScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = useLocalSearchParams<{ email?: string; purpose?: string; secondary?: string; error?: string }>();
  // Normally handed in by signup/login/forgot. A failed email LINK bounces here
  // from auth-callback WITHOUT one (the link carries no address), so the field
  // below lets the user supply it rather than stranding them.
  const [emailInput, setEmailInput] = useState((params.email ?? "").trim());
  const email = emailInput.trim();
  const needsEmail = !(params.email ?? "").trim();
  const purpose = (["signup", "recovery", "email_change"].includes(params.purpose ?? "")
    ? params.purpose
    : "signup") as OtpPurpose;
  const secondary = (params.secondary ?? "").trim();

  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState("");
  // auth-callback forwards a failed email LINK here (expired token, mostly) so
  // the user lands on the code entry with an explanation instead of a dead end.
  const [error, setError] = useState<string | null>((params.error ?? "").trim() || null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  // Secure email change: the first code landed, the sibling one is still due.
  const [awaitingSecond, setAwaitingSecond] = useState(false);

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

    // Try the primary address; for email changes the code may belong to the
    // other one — the token only matches one, so the second attempt is safe.
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
      // With Secure Email Change, the switch completes only after BOTH codes.
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
    // Signup: the session now exists — the root layout unlocked the app.
    setBusy(false);
    router.replace("/home");
  }

  async function handleResend() {
    if (cooldown > 0 || busy) return;
    if (!email) {
      setError("Enter the email address you signed up with.");
      return;
    }
    setError(null);
    const { error } = await resendCode(email, purpose);
    if (error) {
      setError(error);
      return;
    }
    setCooldown(RESEND_COOLDOWN_S);
  }

  function handleChange(text: string) {
    const digits = text.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    setError(null);
    if (digits.length === CODE_LENGTH) submit(digits);
  }

  const title = purpose === "recovery" ? "Reset your password" : awaitingSecond ? "One more code" : "Enter the code";
  const subtitle = needsEmail
    ? `Enter your email address and the ${CODE_LENGTH}-digit code we sent you.`
    : purpose === "email_change"
      ? awaitingSecond
        ? `Almost there — enter the code we sent to your other address to confirm the change.`
        : `We sent codes to ${email}${secondary ? ` and ${secondary}` : ""}. Enter either one to start.`
      : `We emailed a ${CODE_LENGTH}-digit code to ${email}.`;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

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

        <Pressable
          style={styles.cellsRow}
          onPress={() => inputRef.current?.focus()}
          accessibilityLabel={`Code entry, ${code.length} of ${CODE_LENGTH} digits entered`}
        >
          {Array.from({ length: CODE_LENGTH }, (_, i) => {
            const active = i === code.length;
            return (
              <View key={i} style={[styles.cell, active && styles.cellActive]}>
                <Text style={styles.cellDigit}>{code[i] ?? ""}</Text>
              </View>
            );
          })}
        </Pressable>
        {/* The real input: invisible, focused by tapping the cells. One field
            (not six) so paste + iOS code autofill work naturally. */}
        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={code}
          onChangeText={handleChange}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          // When the address still has to be typed, that field goes first.
          autoFocus={!needsEmail}
          caretHidden
          maxLength={CODE_LENGTH}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AccentButton onPress={() => submit(code)} loading={busy} disabled={code.length !== CODE_LENGTH || !email}>
          Verify
        </AccentButton>

        <Pressable
          onPress={handleResend}
          disabled={cooldown > 0}
          style={styles.resend}
          accessibilityRole="button"
          accessibilityState={{ disabled: cooldown > 0 }}
        >
          <Text style={[styles.resendLabel, cooldown > 0 && { color: colors.label3 }]}>
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </Text>
        </Pressable>

        <Text style={styles.footnote}>No code in the email? Older emails may only carry a link — resend to get a code.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    container: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
    title: { fontSize: 22, fontFamily: font.bold, color: colors.label, letterSpacing: -0.4 },
    subtitle: { fontSize: 15, fontFamily: font.regular, color: colors.label2, lineHeight: 21, marginBottom: 8 },
    cellsRow: { flexDirection: "row", gap: 8, justifyContent: "center", marginVertical: 8 },
    cell: {
      width: 46,
      height: 56,
      borderRadius: radius.md,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.sep,
      alignItems: "center",
      justifyContent: "center",
    },
    cellActive: { borderWidth: 1.5, borderColor: colors.accent },
    cellDigit: { fontSize: 24, fontFamily: font.bold, color: colors.label },
    hiddenInput: { position: "absolute", opacity: 0, height: 1, width: 1 },
    error: { color: colors.red, fontSize: 14, fontFamily: font.medium, paddingHorizontal: 4 },
    resend: { alignSelf: "center", paddingVertical: 12, paddingHorizontal: 16 },
    resendLabel: { fontSize: 15, fontFamily: font.semibold, color: colors.accent },
    footnote: { fontSize: 13, fontFamily: font.regular, color: colors.label3, textAlign: "center", lineHeight: 18 },
  });
