// Supabase Edge Function: rc-webhook (EAS phase — not yet deployed)
//
// RevenueCat server webhook. Two jobs:
//   1. keep households.premium (the entitlement flag BOTH clients read) in sync
//      with the store subscription;
//   2. credit coin-pack purchases, which is the ONLY place coins are granted —
//      a client that could grant its own would be minting currency.
//
// Configure the webhook in the RevenueCat dashboard with
// `Authorization: Bearer <RC_WEBHOOK_SECRET>`, and set the SDK's app_user_id to
// the Supabase auth user id (providers/purchases/index.tsx does this).

import { createClient } from "npm:@supabase/supabase-js@2";

const ACTIVE_EVENTS = new Set(["INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "PRODUCT_CHANGE"]);
const INACTIVE_EVENTS = new Set(["CANCELLATION", "EXPIRATION", "BILLING_ISSUE"]);

/**
 * Coin grants, server-side. MUST match the product ids in
 * providers/purchases/products.ts — that file is display metadata; this is the
 * money.
 */
const COIN_PACK_COINS: Record<string, number> = {
  petpal_coins_500: 500,
  petpal_coins_1500: 1500,
  petpal_coins_4000: 4000,
  petpal_coins_10000: 10000,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

type Admin = ReturnType<typeof createClient>;

/**
 * Which household this purchase belongs to. The buyer's ACTIVE household, not
 * one they own: a non-owner member buying coins for the family they're actually
 * in must credit that family. (The old owner_id lookup credited nothing at all
 * for them.)
 */
async function activeHouseholdId(admin: Admin, userId: string): Promise<string | null> {
  const { data: profile } = await admin
    .from("user_profiles")
    .select("active_household_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (profile?.active_household_id) return profile.active_household_id as string;

  // No profile row (or no active household set) — fall back to their oldest
  // membership, which is the one they'd land in on next sign-in.
  const { data: membership } = await admin
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (membership?.household_id as string | undefined) ?? null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // A missing secret is a HARD failure, not a bypass. This endpoint grants
  // currency; running it unauthenticated because an env var wasn't set would let
  // anyone who knows the URL top up any account.
  const secret = Deno.env.get("RC_WEBHOOK_SECRET");
  if (!secret) {
    console.error("[rc-webhook] RC_WEBHOOK_SECRET is not set — refusing to process events");
    return new Response("Server misconfigured", { status: 500 });
  }
  if (req.headers.get("Authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { event } = await req.json();
  const userId: string | undefined = event?.app_user_id;
  const type: string | undefined = event?.type;
  if (!userId || !type) return new Response("Bad request", { status: 400 });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // --- Coin packs (consumables) ---------------------------------------------
  const productId: string | undefined = event?.product_id;
  const coins = productId ? COIN_PACK_COINS[productId] : undefined;
  if (coins && (type === "NON_RENEWING_PURCHASE" || type === "INITIAL_PURCHASE")) {
    // RevenueCat retries on any non-2xx, and can redeliver on its own, so the
    // grant has to be idempotent. The transaction id is the natural key;
    // coin_grants.rc_transaction_id is its PRIMARY KEY (migration 0033), so a
    // replay loses the insert race and we return without crediting twice.
    const txId: string | undefined = event?.transaction_id ?? event?.id;
    if (!txId) return new Response("Bad request: no transaction id", { status: 400 });

    const householdId = await activeHouseholdId(admin, userId);
    if (!householdId) {
      // 200, not 500: retrying won't help until they join a household, and a
      // retry storm helps nobody. Logged so it's findable.
      console.error(`[rc-webhook] no household for user ${userId}; coins not granted (tx ${txId})`);
      return json({ ok: false, reason: "no_household", transaction: txId });
    }

    const { error: grantError } = await admin
      .from("coin_grants")
      .insert({ rc_transaction_id: txId, user_id: userId, household_id: householdId, product_id: productId, coins });
    if (grantError) {
      // 23505 = already granted. Anything else is a real failure worth a retry.
      if (grantError.code === "23505") return json({ ok: true, duplicate: true, transaction: txId });
      return new Response(grantError.message, { status: 500 });
    }

    // RELATIVE increment via RPC — the clients write coins as an absolute value
    // on a debounce, so an absolute write from here could clobber taps that
    // happened while the store sheet was open.
    const { error: creditError } = await admin.rpc("grant_household_coins", { hid: householdId, amount: coins });
    if (creditError) {
      // Roll the ledger row back so a retry can credit properly.
      await admin.from("coin_grants").delete().eq("rc_transaction_id", txId);
      return new Response(creditError.message, { status: 500 });
    }
    return json({ ok: true, coins, household: householdId, transaction: txId });
  }

  // --- Subscription entitlement ---------------------------------------------
  let premium: boolean | null = null;
  if (ACTIVE_EVENTS.has(type)) premium = true;
  else if (INACTIVE_EVENTS.has(type)) premium = false;
  if (premium === null) return json({ ignored: type });

  // Premium follows the buyer's active household, matching the coin path above
  // — previously this only touched households they OWNED, so a member who
  // subscribed unlocked nothing.
  const householdId = await activeHouseholdId(admin, userId);
  if (!householdId) return json({ ok: false, reason: "no_household" });
  const { error } = await admin.from("households").update({ premium }).eq("id", householdId);
  if (error) return new Response(error.message, { status: 500 });

  return json({ ok: true, premium, household: householdId });
});
