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
