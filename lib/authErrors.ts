/**
 * Map raw Supabase auth error strings to friendly, human copy. Falls back to the
 * original message (rather than hiding it) for anything we don't recognize.
 */
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email or password doesn't match. Give it another try.";
  if (m.includes("email not confirmed")) return "Please confirm your email first — check your inbox for the link.";
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("user already exists"))
    return "An account with this email already exists. Try logging in instead.";
  if (m.includes("password should be at least") || m.includes("password is too short"))
    return "Please use a longer password (at least 6 characters).";
  if (m.includes("invalid") && m.includes("email")) return "That doesn't look like a valid email address.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts — please wait a moment and try again.";
  if (m.includes("network") || m.includes("failed to fetch")) return "Couldn't reach the server. Check your connection and try again.";
  return message;
}
