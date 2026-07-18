// Supabase Edge Function: delete-account
//
// The web demo deletes accounts through a Next.js API route holding the
// service-role key. Mobile has no server, so deletion moves here: the caller
// authenticates with their user JWT; the function verifies it, then deletes
// the auth user with the service-role client (cascades clean up app rows).
//
// Deploy: supabase functions deploy delete-account
// Call:   POST with the user's Authorization: Bearer <access_token> header.

import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Resolve the caller from their JWT — never trust a user id in the body.
  const asCaller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const {
    data: { user },
    error: userErr,
  } = await asCaller.auth.getUser();
  if (userErr || !user) return new Response("Unauthorized", { status: 401 });

  const admin = createClient(supabaseUrl, serviceKey);
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
