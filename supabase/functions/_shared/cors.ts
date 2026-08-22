// Shared CORS policy for edge functions.
//
// Default-deny: with ALLOWED_ORIGINS unset, no browser origin gets CORS
// headers, so no website can call these functions from a page. The mobile app
// is unaffected — React Native's fetch sends no Origin header and CORS is a
// browser-only mechanism — as are cron/curl callers.
//
// To test from a browser, set the secret temporarily, e.g.:
//   supabase secrets set ALLOWED_ORIGINS="http://localhost:3000"
const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  if (!origin) return {}; // mobile / cron / curl — not a CORS request at all
  if (!ALLOWED.includes(origin)) return { Vary: "Origin" }; // disallowed site: no headers
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
