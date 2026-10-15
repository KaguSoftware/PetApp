-- 0058: findings from `supabase db advisors` after 0057.
--
-- 1. Trigger functions were EXECUTE-able through /rest/v1/rpc by anon and
--    authenticated. Postgres refuses to run a trigger function outside a
--    trigger, so this was noise rather than a hole — but nothing needs the
--    grant: EXECUTE on a trigger function is checked when the trigger is
--    CREATED, not when it fires. Revoked from every client role.
-- 2. RLS policies that call auth.uid() bare re-evaluate it per row
--    (auth_rls_initplan). Wrapping it in a scalar subquery makes Postgres
--    evaluate it once per statement. Only the live tables are rewritten; the
--    retired ones (0057) have no client access left.

-- 1 ---------------------------------------------------------------------------

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prorettype in ('trigger'::regtype, 'event_trigger'::regtype)
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;
end;
$$;

-- 2 ---------------------------------------------------------------------------

drop policy if exists "see co-members" on public.household_members;
create policy "see co-members" on public.household_members
  for select using (user_id = (select auth.uid()) or public.is_household_member(household_id));

-- 0053 revoked client UPDATE on household_members; this policy only kept the
-- door labelled. Gone.
drop policy if exists "update own membership" on public.household_members;

drop policy if exists "own profile" on public.user_profiles;
create policy "own profile" on public.user_profiles
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- VERIFY: `supabase db advisors --linked --type security` shows no
-- *_security_definer_function_executable rows for trigger functions, and no
-- auth_rls_initplan rows for household_members / user_profiles.
