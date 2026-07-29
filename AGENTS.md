# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

# Postgres: SECURITY DEFINER + pgcrypto

Every SECURITY DEFINER function in `supabase/migrations/` pins `set search_path = public`. On Supabase,
**pgcrypto lives in the `extensions` schema**, so any such function calling `gen_random_bytes`,
`digest`, `crypt`, or `hmac` fails at runtime with `42883 function ... does not exist` — this is what
broke `create_invite` until migration 0031. If a new SECURITY DEFINER function needs pgcrypto, use
`set search_path = public, extensions` (leave the call unqualified: Postgres ignores missing schemas
in `search_path`, so it still resolves where pgcrypto sits in `public`).

`gen_random_uuid()` is exempt — since PG13 it's in `pg_catalog`, always implicitly on the path.

# Postgres: `auth.uid()` is NOT null inside SECURITY DEFINER

SECURITY DEFINER swaps the effective **role** (`current_user`); it does not touch the request GUCs.
`auth.uid()` reads `request.jwt.claims`, which PostgREST sets per request, so it stays populated
inside every RPC. **Never write `if auth.uid() is null then <allow>` as an "it's a trusted RPC"
escape hatch** — it only ever fires for `anon` and the SQL editor. That mistake in 0033's
`members_write_guard` blocked `redeem_invite`/`join_household` from minting the joiner's card, so
joining as a **member** failed while an **admin** invite worked (the admin's `household_members` row,
inserted moments earlier in the same transaction, satisfied the guard). Fixed in 0040.

A trigger that must tell client writes from trusted server-side ones checks `current_user not in
('authenticated', 'anon')` and must itself be **SECURITY INVOKER** — inside a SECURITY DEFINER
function `current_user` is the owner, so a DEFINER trigger can never see its caller.
