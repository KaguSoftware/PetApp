// Supabase Edge Function: delete-account
//
// The web demo deletes accounts through a Next.js API route holding the
// service-role key. Mobile has no server, so deletion moves here: the caller
// authenticates with their user JWT; the function verifies it, hands every
// shared household to a successor via prepare_account_deletion (migration
// 0028 — sole-member households are deleted, owned-with-co-members households
// promote the longest-tenured admin/member), and only then deletes the auth
// user. Without that step, households.owner_id's ON DELETE CASCADE would
// destroy a household other people still use.
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

  // Successor handling FIRST. If the RPC is missing (0028 not applied), stop:
  // proceeding would cascade shared households away with the auth user.
  const { error: prepErr } = await admin.rpc("prepare_account_deletion", { target_user: user.id });
  if (prepErr) {
    const missing = /could not find the function|PGRST202/i.test(`${prepErr.code ?? ""} ${prepErr.message ?? ""}`);
    return new Response(
      JSON.stringify({
        error: missing
          ? "backend migration 0028 required before account deletion"
          : `could not prepare deletion: ${prepErr.message}`,
      }),
      { status: missing ? 409 : 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
