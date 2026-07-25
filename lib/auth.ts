import * as AppleAuthentication from "expo-apple-authentication";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import type { UserIdentity } from "@supabase/supabase-js";
import { friendlyAuthError } from "@/lib/authErrors";
import { supabase } from "@/lib/supabase";

/**
 * The single client-side auth API. Screens call these instead of touching
 * supabase.auth directly so the EAS cutover can swap Google's internals from
 * the browser round-trip to the native one-tap sheet without touching UI.
 *
 * Every function resolves to { error } — null error means success, and
 * cancelled means the user backed out (no error UI should show).
 */

export interface AuthResult {
  error: string | null;
  cancelled?: boolean;
}

/** Where the OAuth browser flow returns to. In Expo Go this is an exp:// URL
 * (add it to the Supabase redirect allowlist while developing); in real
 * builds it's petpal://auth-callback. */
function authRedirectUrl(): string {
  // In a real build this is `petpal://auth-callback` — stable, IP-free, and
  // the one string that needs allowlisting forever.
  //
  // In EXPO GO it must stay the `exp://<lan-ip>:8081/--/auth-callback` form,
  // because a `petpal://` link cannot reopen Expo Go (Expo Go owns `exp://`).
  // That URL changes with the network, so it has to be re-allowlisted whenever
  // the LAN IP or tunnel changes — when it doesn't match, Supabase silently
  // falls back to Site URL and the user lands on `localhost:3000/?code=…`
  // with auth already succeeded. The log line below prints the exact value to
  // paste into Supabase → Authentication → URL Configuration → Redirect URLs.
  const url =
    Constants.appOwnership === "expo"
      ? Linking.createURL("auth-callback")
      : Linking.createURL("auth-callback", { scheme: "petpal" });
  console.log("[petpal] OAuth redirectTo =", url, "— this EXACT string must be in Supabase's Redirect URLs");
  return url;
}

// ---------------------------------------------------------------- Apple ----

/** Native Sign in with Apple — works in Expo Go on iOS (SDK 54). */
export async function isAppleSignInAvailable(): Promise<boolean> {
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function signInWithApple(): Promise<AuthResult> {
  try {
    // The raw nonce goes to Supabase; its SHA-256 goes to Apple. Supabase
    // hashes what we give it and matches it against the token's nonce claim.
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    if (!credential.identityToken) {
      return { error: "Apple didn't return a sign-in token. Please try again." };
    }
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
      nonce: rawNonce,
    });
    if (error) return { error: friendlyAuthError(error.message) };

    // Apple provides the name exactly ONCE (first authorization) — persist it
    // now or lose it. Never overwrite a name the user already has.
    const given = credential.fullName?.givenName;
    if (given && !data.user?.user_metadata?.name) {
      const name = [given, credential.fullName?.familyName].filter(Boolean).join(" ");
      await supabase.auth.updateUser({ data: { name } });
    }
    return { error: null };
  } catch (e) {
    if ((e as { code?: string })?.code === "ERR_REQUEST_CANCELED") return { error: null, cancelled: true };
    return { error: friendlyAuthError(e instanceof Error ? e.message : String(e)) };
  }
}

// --------------------------------------------------------------- Google ----

/** Pulls a query param out of a redirect URL. Uses expo-linking's parser, NOT
 * `new URL()`: for a custom scheme like `petpal://auth-callback?code=…` the
 * WHATWG parser treats "auth-callback" as the host and does not reliably
 * expose the query, so `searchParams.get("code")` comes back null and a
 * perfectly good sign-in looks like a failure. */
function paramFromRedirect(url: string, key: string): string | null {
  const value = Linking.parse(url).queryParams?.[key];
  const first = Array.isArray(value) ? value[0] : value;
  return first == null ? null : String(first);
}

/** Runs an already-built Supabase OAuth URL through the system browser and
 * exchanges the returned PKCE code for a session. Shared by sign-in and
 * identity linking (both hand back the same ?code= shape). */
async function completeBrowserOAuth(url: string, redirectTo: string): Promise<AuthResult> {
  // The redirect can come back two ways, and on some devices ONLY the second:
  //  1. WebBrowser resolves with {type:"success", url}
  //  2. The OS deep-links the app and the URL arrives on the Linking listener
  // Android Chrome Custom Tabs frequently reports "dismiss" even on a
  // successful redirect (the deep link foregrounds the app and races the
  // browser result), so the listener is armed BEFORE the browser opens and
  // whichever fires first wins.
  let resolveUrl: (u: string | null) => void = () => {};
  const linkPromise = new Promise<string | null>((resolve) => {
    resolveUrl = resolve;
  });
  const sub = Linking.addEventListener("url", (e) => resolveUrl(e.url));
  const waitForLink = (ms: number) =>
    Promise.race([linkPromise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);

  let redirectUrl: string | null = null;
  try {
    // Devices without Google Mobile Services (Huawei, some Android ROMs) have
    // NO Custom Tabs provider at all. openAuthSessionAsync then either throws
    // or opens a browser that never hands control back, so the sign-in appears
    // to do nothing. Detect that up front and use the plain external browser,
    // relying entirely on the deep link to return.
    let hasCustomTabs = true;
    if (Platform.OS === "android") {
      try {
        const browsers = await WebBrowser.getCustomTabsSupportingBrowsersAsync();
        hasCustomTabs = (browsers.browserPackages?.length ?? 0) > 0;
      } catch {
        hasCustomTabs = false;
      }
    }

    if (!hasCustomTabs) {
      await Linking.openURL(url);
      // No browser result to await — the deep link is the only signal. Allow
      // a generous window: the user has to pick an account and sign in.
      redirectUrl = await waitForLink(5 * 60 * 1000);
    } else {
      const result = await WebBrowser.openAuthSessionAsync(url, redirectTo);
      if (result.type === "success") {
        redirectUrl = result.url;
      } else {
        // Give the deep link a moment to land before believing the dismissal.
        redirectUrl = await waitForLink(1200);
      }
    }
  } catch (e) {
    // openAuthSessionAsync throws when no browser can handle the intent.
    console.warn("[petpal] browser auth session failed, falling back to deep link:", e);
    try {
      await Linking.openURL(url);
      redirectUrl = await waitForLink(5 * 60 * 1000);
    } catch {
      sub.remove();
      return { error: "Couldn't open a browser to sign in. Please use email sign-in instead." };
    }
  } finally {
    sub.remove();
  }

  if (!redirectUrl) return { error: null, cancelled: true };

  const code = paramFromRedirect(redirectUrl, "code");
  if (!code) {
    const description = paramFromRedirect(redirectUrl, "error_description");
    return {
      error: description
        ? friendlyAuthError(description)
        : "Sign-in didn't complete. Please try again.",
    };
  }
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return { error: error ? friendlyAuthError(error.message) : null };
}

/** Browser-based Google sign-in (Expo Go-safe). SCOPE(EAS cutover): swap the
 * internals for @react-native-google-signin one-tap + signInWithIdToken. */
export async function signInWithGoogle(): Promise<AuthResult> {
  const redirectTo = authRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data?.url) {
    return { error: friendlyAuthError(error?.message ?? "Couldn't start Google sign-in.") };
  }
  return completeBrowserOAuth(data.url, redirectTo);
}

// ---------------------------------------------------------------- Email ----

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<AuthResult & { needsVerification: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    // seed_demo:false tells handle_new_user (migration 0029) to skip the
    // demo-household seeding — mobile users get the create-or-join onboarding.
    options: { data: { name: name || "You", seed_demo: false } },
  });
  if (error) return { error: friendlyAuthError(error.message), needsVerification: false };
  // With email confirmation on, signing up with an ALREADY-REGISTERED address
  // returns no error at all — GoTrue hands back an obfuscated user with an
  // empty `identities` array and no session, and sends nothing. Without this
  // check the user is sent to the code screen to wait for an email that never
  // arrives, with no hint that they should just log in.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return {
      error: "An account with this email already exists. Try logging in instead.",
      needsVerification: false,
    };
  }
  return { error: null, needsVerification: !data.session };
}

export type OtpPurpose = "signup" | "recovery" | "email_change";

/** Verify a 6-digit code from a Supabase email ({{ .Token }} in the template). */
export async function verifyEmailOtp(email: string, token: string, purpose: OtpPurpose): Promise<AuthResult> {
  const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: token.trim(), type: purpose });
  return { error: error ? friendlyAuthError(error.message) : null };
}

/** Sends the recovery email (code + link). No redirectTo on purpose — the
 * code is the mobile path; the link keeps working for the web demo. */
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
  return { error: error ? friendlyAuthError(error.message) : null };
}

export async function resendCode(email: string, purpose: OtpPurpose): Promise<AuthResult> {
  if (purpose === "recovery") return requestPasswordReset(email);
  const { error } = await supabase.auth.resend({
    type: purpose === "signup" ? "signup" : "email_change",
    email: email.trim(),
  });
  return { error: error ? friendlyAuthError(error.message) : null };
}

// --------------------------------------------- Connected accounts (link) ----

export async function getConnectedIdentities(): Promise<UserIdentity[]> {
  const { data } = await supabase.auth.getUserIdentities();
  return data?.identities ?? [];
}

/** Attach Google to the signed-in account (requires "Manual linking" enabled
 * in the Supabase dashboard). Same browser round-trip as sign-in. */
export async function linkGoogle(): Promise<AuthResult> {
  const redirectTo = authRedirectUrl();
  const { data, error } = await supabase.auth.linkIdentity({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data?.url) {
    return { error: friendlyAuthError(error?.message ?? "Couldn't start linking.") };
  }
  return completeBrowserOAuth(data.url, redirectTo);
}

export async function unlinkIdentity(identity: UserIdentity): Promise<AuthResult> {
  const { error } = await supabase.auth.unlinkIdentity(identity);
  return { error: error ? friendlyAuthError(error.message) : null };
}
