-- Verification for migration 0044_audit_log.sql.
-- Run in the Supabase SQL editor AFTER applying 0044. Four blocks; run them
-- one at a time and keep each block's output.
--
-- Block C creates throwaway auth users and ends in ROLLBACK — it leaves NOTHING
-- behind. Do not remove the ROLLBACK.

-- ============================================================ BLOCK A =======
-- "Zero policies on audit_log." Expected: policy_count = 0, rls_enabled = true,
-- force_rls = false (force would break the SECURITY DEFINER writers).

select
  c.relname                                              as table_name,
  c.relrowsecurity                                       as rls_enabled,
  c.relforcerowsecurity                                  as force_rls,
  (select count(*) from pg_policies p
    where p.schemaname = 'public' and p.tablename = 'audit_log') as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'audit_log';

-- Belt and braces: list them. Expected: zero rows.
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'audit_log';

-- And the grants. Expected: zero rows for anon/authenticated.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'audit_log'
  and grantee in ('anon', 'authenticated', 'public');

-- ============================================================ BLOCK B =======
-- "authenticated cannot read audit_log." Run each of the three statements
-- separately — the first two are EXPECTED TO FAIL, and a failure aborts the
-- rest of a multi-statement block.

-- B1 — expected: ERROR 42501 "permission denied for table audit_log"
begin;
  set local role authenticated;
  select * from audit_log;
rollback;

-- B2 — expected: ERROR 42501 as well (write path is just as closed)
begin;
  set local role authenticated;
  insert into audit_log (action) values ('member.removed');
rollback;

-- B3 — proves the denial is not "the table is empty". As postgres/service_role
-- the same select works. Expected: a number (0 on a fresh install).
select count(*) as rows_visible_to_service_role from audit_log;

-- ============================================================ BLOCK C =======
-- End-to-end: a real remove_household_member and a real set_member_role, then
-- the audit rows they produced. Ends in ROLLBACK — nothing persists.

begin;

do $$
declare
  owner_id  uuid := gen_random_uuid();
  member_id uuid := gen_random_uuid();
  hid uuid;
  n_removed int;
  n_role    int;
begin
  -- Two throwaway accounts.
  insert into auth.users (id, email, raw_user_meta_data)
  values (owner_id,  'audit-owner@example.invalid',  '{"name":"Owner"}'::jsonb),
         (member_id, 'audit-member@example.invalid', '{"name":"Member"}'::jsonb);

  -- Act as the owner. auth.uid() reads request.jwt.claims, which is what
  -- PostgREST sets per request — so this is the same code path the app takes.
  perform set_config('request.jwt.claims', json_build_object('sub', owner_id)::text, true);

  hid := public.create_household('Audit test household');

  -- Put the second account in as a plain member.
  insert into household_members (household_id, user_id, role)
  values (hid, member_id, 'member');

  -- (1) promote, (2) remove — the two actions asked for.
  perform public.set_member_role(hid, member_id, 'admin');
  perform public.remove_household_member(hid, member_id);

  select count(*) into n_role
    from audit_log where household_id = hid and action = 'member.role_changed';
  select count(*) into n_removed
    from audit_log where household_id = hid and action = 'member.removed';

  raise notice 'member.role_changed rows: %  (expected 1)', n_role;
  raise notice 'member.removed rows:      %  (expected 1)', n_removed;

  if n_role <> 1 or n_removed <> 1 then
    raise exception 'AUDIT LOG DID NOT RECORD THE ACTIONS';
  end if;

  -- Park the ids so the select below can find the rows after the DO block.
  perform set_config('audit.test_household', hid::text, true);
end;
$$;

-- The actual rows. Check by eye: actor = the owner, target = the member,
-- metadata carries from_role/to_role and removed_role, and NOTHING in here is
-- an e-mail, a name, an invite code or a hash.
select id, created_at, action, actor_user_id, household_id, target_user_id,
       target_id, metadata
from audit_log
where household_id = current_setting('audit.test_household')::uuid
order by id;

rollback;   -- <<< keep this

-- ============================================================ BLOCK D =======
-- Sanity: the action whitelist actually rejects free text.
-- Expected: ERROR 23514 violates check constraint "audit_log_action_check"
begin;
  insert into audit_log (action) values ('whatever i feel like');
rollback;

-- Expected: ERROR 23514 violates constraint "audit_log_metadata_no_secrets"
begin;
  insert into audit_log (action, metadata)
  values ('invite.created', '{"code":"ABCD-1234"}'::jsonb);
rollback;
