-- 0046: audit the legacy join_household(uuid) path.
--
-- join_household is the web demo's original invite: the household UUID itself,
-- handed out as a link (/join?f=<uuid>). It is a permanent, un-revocable bearer
-- credential that admits ANY authenticated user as a 'member', with no code, no
-- expiry, no approval and no use limit. 0027 replaced it with real invites and
-- 0037 put approval in front of those, but this function was left in place for
-- web-demo compatibility and still works today.
--
-- That makes it the one remaining way to gain access to a household's data
-- without leaving a trace, which is exactly what 0044 set out to close. It was
-- missed there because the function is defined in the web demo's migration 0011,
-- not in this repository — the body below was recovered from the live database
-- with pg_get_functiondef and is reproduced unchanged apart from the audit line.
--
-- NOT a fix for the underlying design. Whether this path should exist at all
-- belongs to the endpoint/authorization review, not to a logging migration.
--
-- Depends on 0044 (audit_log, write_audit_log) and 0045 (private schema).

-- The action whitelist is a CHECK, so a new action means editing the constraint.
-- The table lives in `private` since 0045.
alter table private.audit_log drop constraint if exists audit_log_action_check;
alter table private.audit_log add constraint audit_log_action_check check (action in (
  'member.removed',
  'member.role_changed',
  'household.ownership_transferred',
  'household.deleted',
  'invite.created',
  'invite.revoked',
  'invite.redeemed',
  'join_request.approved',
  'join_request.rejected',
  'pet_transfer.accepted',
  'account.deletion_prepared',
  -- new in 0046
  'household.joined_via_link'
));

create or replace function public.join_household(target uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing_member uuid;
  newly_joined boolean;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from households where id = target) then
    raise exception 'household not found' using errcode = 'P0002';
  end if;

  -- Checked BEFORE the insert: the original uses `on conflict do nothing`, so
  -- afterwards there is no way to tell a fresh grant from a re-visit. Only a
  -- real grant is worth a log line — an existing member re-opening the link is
  -- just an active-household switch.
  newly_joined := not exists (
    select 1 from household_members where household_id = target and user_id = uid
  );

  insert into household_members (household_id, user_id, role)
  values (target, uid, 'member')
  on conflict do nothing;

  -- Give the joining user their own decorative member card if they lack one.
  select member_id into existing_member
    from household_members where household_id = target and user_id = uid;
  if existing_member is null then
    insert into members (household_id, name, emoji, role, gradient_from, gradient_to)
    values (
      target,
      coalesce((select raw_user_meta_data ->> 'name' from auth.users where id = uid), 'New member'),
      '🧑', 'Member', 'oklch(0.6 0.13 200)', 'oklch(0.48 0.13 240)'
    )
    returning id into existing_member;
    update household_members set member_id = existing_member
      where household_id = target and user_id = uid;
  end if;

  insert into user_profiles (user_id, active_household_id)
  values (uid, target)
  on conflict (user_id) do update set active_household_id = excluded.active_household_id;

  if newly_joined then
    perform public.write_audit_log(
      'household.joined_via_link', target, uid, null,
      jsonb_build_object('granted_role', 'member',
                         'path', 'legacy_household_id_link',
                         'approval_required', false)
    );
  end if;

  return target;
end;
$$;

-- create or replace preserves ACLs; restated so the migration is self-contained
-- and matches the grant the web demo relies on.
revoke all on function public.join_household(uuid) from public;
grant execute on function public.join_household(uuid) to authenticated;
