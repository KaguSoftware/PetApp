-- 0052: invites become the ONLY way into a household.
--
-- join_household(uuid) (web 0011, re-defined in 0046) adds the caller as a
-- member of ANY household whose id they know — no invite, no expiry, no
-- revocation, no rate limit. Household ids were readable by every signed-in
-- user through chat/forum author columns, so this was an open door. The
-- family password (0047–0050) only ever gated that same legacy path; with the
-- path gone it protects nothing, and its unsalted client-side SHA-256 was weak
-- anyway. Both go.
--
-- Depends on 0051 (households column grants).

drop function if exists public.join_household(uuid);
drop function if exists public.verify_family_password(uuid, text);
drop function if exists public.set_family_password(uuid, text, text);

-- family_password_set (0049) is GENERATED from family_password_hash, so it
-- must go first.
alter table public.households drop column if exists family_password_set;
alter table public.households drop column if exists family_password_hash;

-- 0050 swapped table-level SELECT for a frozen column list so the hash could be
-- hidden. Nothing on the row is secret any more, so table-level SELECT comes
-- back — otherwise every column added after 0050 is unreadable (42501),
-- including inside RLS policies that reference it.
grant select on public.households to authenticated;

-- Existing family_password attempt rows are now meaningless.
delete from private.auth_attempts where kind = 'family_password';

-- VERIFY:
--   select proname from pg_proc where proname in
--     ('join_household', 'verify_family_password', 'set_family_password');  -- 0 rows
--   select column_name from information_schema.columns
--    where table_name = 'households' and column_name like 'family_password%';  -- 0 rows
