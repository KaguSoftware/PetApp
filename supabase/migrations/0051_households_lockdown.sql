-- 0051: households become server-owned except for three user settings.
--
-- The web demo is retired (owner decision, 2026-10-15); the rebuilt mobile app
-- is the only client. That removes the reason 0043 re-opened client writes to
-- coins / streak / last_streak_bonus / premium: any member could PATCH
-- `{premium: true, coins: 999999}` on their own household.
--
-- After this migration a client may UPDATE only:
--   name, units, timezone (new — the server-side streak, 0054, buckets days in it)
-- and may neither INSERT nor DELETE households directly:
--   * creation goes through create_household() (SECURITY DEFINER, 0028)
--   * deletion goes through delete_household() (SECURITY DEFINER, audited, 0044)
-- Direct DELETE also skipped the audit trail and left user_profiles pointing at
-- a household the user could no longer read.
--
-- With direct INSERT gone, 0026's households_single_owned_guard has nothing to
-- guard, and its pg_advisory_xact_lock(bigint, bigint) call has no matching
-- overload in Postgres (only (bigint) and (int, int) exist) — so it is dropped
-- rather than repaired. create_household() still sets its flag; harmless.

-- 1. Column-level UPDATE: replace 0042 + 0043's lists --------------------------

alter table public.households add column if not exists timezone text;

alter table public.households drop constraint if exists households_timezone_check;
alter table public.households add constraint households_timezone_check
  check (timezone is null or (length(timezone) between 1 and 64 and timezone ~ '^[A-Za-z0-9_+\-/]+$'));

revoke update on public.households from authenticated, anon;
grant update (name, units, timezone) on public.households to authenticated;

-- 0050 (if applied) replaced table-level SELECT with a column list frozen at
-- apply time, so the new column must be granted explicitly. Harmless if 0050
-- was never applied (table-level SELECT already covers it). 0052 restores
-- table-level SELECT once family_password_hash is gone.
grant select (timezone) on public.households to authenticated;

-- 2. No direct INSERT / DELETE -------------------------------------------------

revoke insert, delete on public.households from authenticated, anon;
drop policy if exists "member household insert" on public.households;
drop policy if exists "owner household delete" on public.households;

drop trigger if exists households_single_owned_guard on public.households;
drop function if exists public.guard_single_owned_household();

-- 3. Rename guard: 0026's version waved through auth.uid() IS NULL (the
-- AGENTS.md anti-pattern). Re-written on current_user, SECURITY INVOKER so it
-- can see its caller; the role read stays in the DEFINER helper.

create or replace function public.guard_household_rename()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon')
     and not public.has_household_role(new.id, array['owner', 'admin']) then
    raise exception 'only the owner or an admin can rename the household'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- VERIFY (as an authenticated member, e.g. via the app or a JWT in the SQL editor):
--   update households set premium = true  where id = '<own>';  -- 42501
--   update households set coins = 1       where id = '<own>';  -- 42501
--   update households set units = 'lb'    where id = '<own>';  -- ok
--   delete from households                where id = '<own>';  -- 42501
