-- 0049: add the boolean that replaces the family password hash on the client.
--
-- Deliberately split from the revoke (0050). The ordering constraint is a
-- chicken-and-egg: the clients must stop selecting `*` before the revoke lands,
-- but they cannot select `family_password_set` before it exists. So:
--
--   0049 (this)  add the generated column        — additive, breaks nothing
--   then         ship the mobile client          — selects columns explicitly
--   then         ship the WEB DEMO                — shares this database
--   0050         revoke SELECT on the hash       — only once both are out
--
-- Applying 0050 early turns every household hydration into 42501 in whichever
-- client is still asking for `*`. Applying this one early costs nothing.
--
-- The client only ever needed the boolean, never the hash — it derives
-- `familyPasswordSet` from it and nothing else. A generated column means the
-- two can never drift.

alter table public.households
  add column if not exists family_password_set boolean
  generated always as (family_password_hash is not null) stored;
