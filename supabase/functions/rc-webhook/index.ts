// Supabase Edge Function: rc-webhook (EAS phase — not yet deployed)
//
// RevenueCat server webhook → keeps households.premium (the entitlement flag
// BOTH clients read) in sync with the store subscription. Configure the
// webhook in the RevenueCat dashboard with Authorization: Bearer <RC_WEBHOOK_SECRET>
// and set app_user_id to the Supabase auth user id when configuring the SDK.

import { createClient } from "npm:@supabase/supabase-js@2";

const ACTIVE_EVENTS = new Set(["INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "PRODUCT_CHANGE"]);
const INACTIVE_EVENTS = new Set(["CANCELLATION", "EXPIRATION", "BILLING_ISSUE"]);

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("RC_WEBHOOK_SECRET");
  if (secret && req.headers.get("Authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { event } = await req.json();
  const userId: string | undefined = event?.app_user_id;
  const type: string | undefined = event?.type;
  if (!userId || !type) return new Response("Bad request", { status: 400 });

  let premium: boolean | null = null;
  if (ACTIVE_EVENTS.has(type)) premium = true;
  else if (INACTIVE_EVENTS.has(type)) premium = false;
  if (premium === null) return new Response(JSON.stringify({ ignored: type }), { headers: { "Content-Type": "application/json" } });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // Premium is per-household: apply to every household this user owns.
  const { data: owned, error } = await admin.from("households").select("id").eq("owner_id", userId);
  if (error) return new Response(error.message, { status: 500 });
  const ids = (owned ?? []).map((h) => h.id);
  if (ids.length > 0) await admin.from("households").update({ premium }).in("id", ids);

  return new Response(JSON.stringify({ ok: true, premium, households: ids.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
