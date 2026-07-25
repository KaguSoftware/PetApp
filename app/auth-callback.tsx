import { Redirect } from "expo-router";

/**
 * Landing pad for OAuth redirects (petpal://auth-callback, or the exp://
 * equivalent in Expo Go). The actual code exchange happens in lib/auth.ts via
 * WebBrowser.openAuthSessionAsync's resolved URL — by the time the OS routes
 * this URL, the session either exists (→ home) or the root guard bounces to
 * the auth stack. This screen exists so the URL never 404s.
 */
export default function AuthCallback() {
  return <Redirect href="/home" />;
}
