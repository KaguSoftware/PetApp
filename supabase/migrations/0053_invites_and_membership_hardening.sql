-- 0053: invites that join directly, a limiter that actually counts, and no
-- client-side back doors into household_members / members.
--
-- 1. THE LIMITER NEVER COUNTED A WRONG CODE. 0048's redeem_invite did
--        perform record_attempt(..., false);
--        raise exception 'invite not found';
--    and the raise rolls back the transaction — including the attempt row it
--    had just written. enforce_attempt_limit therefore always saw zero
--    failures: invite codes (~39 bits) were brute-forceable at RPC speed.
--    Fix: redeem_invite RETURNS a status instead of raising on a wrong code,
--    so the failure row commits. It also takes a per-(user, kind) advisory
--    lock before checking, so N parallel calls can't all pass the check before
--    any of them records; and only a SUCCESSFUL join clears the bucket (0048
--    cleared it on any found code, so owning one expired code reset the budget
--    every 9 guesses).
--
-- 2. INVITES JOIN DIRECTLY. The rebuilt app has simple sharing (owner
--    decision): whoever holds a live code joins. The 0037 approval queue is
--    retired; its table and RPCs are dropped in the cleanup migration. The
--    invite row is locked FOR UPDATE so max_uses / expiry can't race.
--
-- 3. NO DIRECT WRITES TO household_members. Leaving and removing go through
--    the audited RPCs (leave_household / remove_household_member). The
--    client-writable member_id pointer (0026 §2, kept for the web demo's
--    "view as") let a member point their membership at someone else's card and
--    edit it as their own; it is revoked, and one card can now be claimed by
--    at most one account.
--
-- 4. guard_member_write authorised UPDATEs against the NEW household_id
--    (coalesce(new, old)), so an admin of household B could move household A's
--    cards into B. It now authorises against OLD and forbids moving cards.
--
-- 5. transfer_ownership locks the household row; a partial unique index
--    makes "one owner per household" a hard constraint.
--
-- 6. anon loses EXECUTE on every public RPC. Supabase grants it by default;
--    every RPC here requires a signed-in user.

-- 1 + 2. redeem_invite ---------------------------------------------------------

create or replace function public.redeem_invite(invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  normalized text;
  inv household_invites;
  card_id uuid;
  fails integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  -- Serialise this user's redeem attempts (released at commit/rollback).
  perform pg_advisory_xact_lock(hashtextextended('petpal.invite_redeem:' || uid::text, 0));

  select count(*) into fails
  from private.auth_attempts
  where kind = 'invite_redeem' and user_id = uid and scope = 'global'
    and not succeeded and attempted_at > now() - interval '1 hour';
  if fails >= 10 then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  normalized := upper(regexp_replace(coalesce(invite_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if length(normalized) = 8 then
    select * into inv from household_invites
      where code = substr(normalized, 1, 4) || '-' || substr(normalized, 5, 4)
      for update;
  end if;

  if inv.id is null then
    insert into private.auth_attempts (kind, user_id, scope, succeeded)
    values ('invite_redeem', uid, 'global', false);
    delete from private.auth_attempts
      where user_id = uid and attempted_at < now() - interval '1 day';
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  -- A real but dead code is not a guess: no failure recorded, bucket kept.
  -- An invite also dies with its creator's authority: one minted by an admin
  -- who has since been demoted or removed must not keep granting access.
  if inv.revoked_at is not null
     or inv.expires_at <= now()
     or (inv.max_uses is not null and inv.use_count >= inv.max_uses)
     or not exists (
       select 1 from household_members
       where household_id = inv.household_id and user_id = inv.created_by
         and (role = 'owner' or (role = 'admin' and inv.role = 'member'))
     ) then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  if exists (select 1 from household_members
             where household_id = inv.household_id and user_id = uid) then
    insert into user_profiles (user_id, active_household_id)
    values (uid, inv.household_id)
    on conflict (user_id) do update set active_household_id = excluded.active_household_id;
    perform public.write_audit_log('invite.redeemed', inv.household_id, null, inv.id,
      jsonb_build_object('outcome', 'already_member'));
    return jsonb_build_object('ok', false, 'reason', 'already_member',
                              'household_id', inv.household_id);
  end if;

  insert into household_members (household_id, user_id, role)
  values (inv.household_id, uid, inv.role);

  if inv.target_member_id is not null
     and exists (select 1 from members
                 where id = inv.target_member_id and household_id = inv.household_id)
     and not exists (select 1 from household_members where member_id = inv.target_member_id) then
    card_id := inv.target_member_id;
  else
    insert into members (household_id, name, emoji, role, gradient_from, gradient_to)
    values (
      inv.household_id,
      coalesce(nullif(trim((select raw_user_meta_data ->> 'name' from auth.users where id = uid)), ''),
               'New member'),
      '🙂', 'Member', '#8EC5FF', '#3C8AF3'
    )
    returning id into card_id;
  end if;

  update household_members set member_id = card_id
    where household_id = inv.household_id and user_id = uid;
  update household_invites set use_count = use_count + 1 where id = inv.id;

  insert into user_profiles (user_id, active_household_id)
  values (uid, inv.household_id)
  on conflict (user_id) do update set active_household_id = excluded.active_household_id;

  -- Success: clear this user's failure bucket and prune old rows.
  delete from private.auth_attempts
    where kind = 'invite_redeem' and user_id = uid
      and (not succeeded or attempted_at < now() - interval '1 day');

  perform public.write_audit_log('invite.redeemed', inv.household_id, uid, inv.id,
    jsonb_build_object('outcome', 'joined', 'granted_role', inv.role,
                       'claimed_existing_card', card_id = inv.target_member_id));

  return jsonb_build_object('ok', true, 'household_id', inv.household_id);
end;
$$;
revoke all on function public.redeem_invite(text) from public, anon;
grant execute on function public.redeem_invite(text) to authenticated;

create index if not exists auth_attempts_user_idx
  on private.auth_attempts (user_id, attempted_at);

-- 3. household_members: no direct DELETE / UPDATE ------------------------------

drop policy if exists "leave household" on public.household_members;
-- INSERT was only blocked by the absence of a policy; make it a privilege too.
revoke insert, update, delete, truncate, references, trigger
  on public.household_members from authenticated, anon;

do $$
begin
  if exists (
    select member_id from public.household_members
    where member_id is not null group by member_id having count(*) > 1
  ) then
    raise exception using
      message = 'household_members has a card claimed by more than one account',
      hint = 'select member_id, array_agg(user_id) from household_members where member_id is not null group by 1 having count(*) > 1; — null out the extra pointers, then re-run';
  end if;
end;
$$;
create unique index if not exists household_members_member_id_uniq
  on public.household_members (member_id) where member_id is not null;

-- 4. guard_member_write: authorise against OLD, never move cards ---------------

create or replace function public.guard_member_write()
returns trigger
language plpgsql
-- INVOKER on purpose: current_user must be the caller (see 0040).
security invoker
set search_path = public
as $$
declare
  hid uuid := case when tg_op = 'INSERT' then new.household_id else old.household_id end;
  target uuid := case when tg_op = 'INSERT' then new.id else old.id end;
begin
  if current_user not in ('authenticated', 'anon') then
    return coalesce(new, old);
  end if;

  if auth.uid() is null then
    raise exception 'only the owner or an admin can manage family cards' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and new.household_id is distinct from old.household_id then
    raise exception 'cannot move a card between households' using errcode = '42501';
  end if;

  if public.has_household_role(hid, array['owner', 'admin']) then
    return coalesce(new, old);
  end if;

  if tg_op = 'UPDATE' and public.is_own_member_card(hid, target) then
    return new;
  end if;

  raise exception 'only the owner or an admin can manage family cards' using errcode = '42501';
end;
$$;

-- 0026's claimed-card guard had the auth.uid()-is-null escape hatch. Same rule,
-- keyed on current_user; INVOKER so it sees the caller.
create or replace function public.guard_claimed_card_delete()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon')
     and exists (select 1 from public.household_members where member_id = old.id) then
    raise exception 'this member is linked to an account — remove the member from the household instead'
      using errcode = '42501';
  end if;
  return old;
end;
$$;

-- 5. One owner per household ---------------------------------------------------

do $$
begin
  if exists (
    select household_id from public.household_members
    where role = 'owner' group by household_id having count(*) > 1
  ) then
    raise exception using
      message = 'a household has more than one owner',
      hint = 'select household_id, array_agg(user_id) from household_members where role = ''owner'' group by 1 having count(*) > 1;';
  end if;
end;
$$;
create unique index if not exists household_members_one_owner
  on public.household_members (household_id) where role = 'owner';

-- prepare_account_deletion (0044) promoted the successor while the departing
-- owner still held 'owner' — with the index above that raises 23505 and, via
-- the BEFORE DELETE trigger on auth.users, makes the account undeletable.
-- Same body, with the departing owner demoted first.
create or replace function public.prepare_account_deletion(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  successor uuid;
  households_deleted integer := 0;
  ownerships_moved integer := 0;
  memberships_removed integer := 0;
begin
  for m in
    select hm.household_id, hm.role from household_members hm
    where hm.user_id = target_user
  loop
    if (select count(*) from household_members
        where household_id = m.household_id) = 1 then
      perform public.write_audit_log(
        'household.deleted', m.household_id, null, null,
        jsonb_build_object('member_count', 1, 'reason', 'last_member_account_deleted'),
        target_user
      );
      delete from households where id = m.household_id;
      households_deleted := households_deleted + 1;
      continue;
    end if;

    if m.role = 'owner' then
      select user_id into successor from household_members
        where household_id = m.household_id and user_id <> target_user
        order by (role <> 'admin'), joined_at asc
        limit 1;
      update household_members set role = 'member'
        where household_id = m.household_id and user_id = target_user;
      update household_members set role = 'owner'
        where household_id = m.household_id and user_id = successor;
      update households set owner_id = successor where id = m.household_id;

      perform public.write_audit_log(
        'household.ownership_transferred', m.household_id, successor, null,
        jsonb_build_object('voluntary', false, 'reason', 'owner_account_deleted'),
        target_user
      );
      ownerships_moved := ownerships_moved + 1;
    end if;

    delete from household_members
      where household_id = m.household_id and user_id = target_user;
    memberships_removed := memberships_removed + 1;
  end loop;

  perform public.write_audit_log(
    'account.deletion_prepared', null, target_user, null,
    jsonb_build_object('households_deleted', households_deleted,
                       'ownerships_transferred', ownerships_moved,
                       'memberships_removed', memberships_removed),
    target_user
  );
end;
$$;
revoke all on function public.prepare_account_deletion(uuid) from public, authenticated, anon;
grant execute on function public.prepare_account_deletion(uuid) to service_role;

create or replace function public.transfer_ownership(hid uuid, new_owner uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  perform 1 from households where id = hid for update;

  if not public.has_household_role(hid, array['owner']) then
    raise exception 'only the owner can transfer ownership' using errcode = '42501';
  end if;
  if new_owner = uid then
    raise exception 'already the owner' using errcode = '22023';
  end if;
  perform 1 from household_members
    where household_id = hid and user_id = new_owner for update;
  if not found then
    raise exception 'not a member of this household' using errcode = 'P0002';
  end if;

  -- Demote first so the one-owner index never sees two owners.
  update household_members set role = 'admin'
    where household_id = hid and user_id = uid;
  update household_members set role = 'owner'
    where household_id = hid and user_id = new_owner;
  update households set owner_id = new_owner where id = hid;

  perform public.write_audit_log(
    'household.ownership_transferred', hid, new_owner, null,
    jsonb_build_object('previous_owner_demoted_to', 'admin', 'voluntary', true)
  );
end;
$$;
revoke all on function public.transfer_ownership(uuid, uuid) from public, anon;
grant execute on function public.transfer_ownership(uuid, uuid) to authenticated;

-- 6. anon loses EXECUTE on every non-trigger function in public ----------------
-- Revoking from PUBLIC too (anon inherits through it); authenticated and
-- service_role are re-granted wherever they could execute before, so nothing
-- that works for a signed-in user or an Edge Function changes.

do $$
declare
  f record;
  had_auth boolean;
  had_service boolean;
begin
  for f in
    select p.oid, p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prorettype <> 'trigger'::regtype
      and p.prokind = 'f'
      and has_function_privilege('anon', p.oid, 'execute')
  loop
    had_auth := has_function_privilege('authenticated', f.oid, 'execute');
    had_service := has_function_privilege('service_role', f.oid, 'execute');
    execute format('revoke execute on function %s from public, anon', f.sig);
    if had_auth then
      execute format('grant execute on function %s to authenticated', f.sig);
    end if;
    if had_service then
      execute format('grant execute on function %s to service_role', f.sig);
    end if;
  end loop;
end;
$$;

-- An IN SCHEMA revoke cannot remove the built-in global EXECUTE-to-PUBLIC
-- default; it has to be revoked for the creating role. From here on every new
-- RPC needs an explicit `grant execute ... to authenticated`.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon;

-- VERIFY:
--   wrong code ×11 within an hour as one user → the 11th returns reason 'rate_limited'
--   select count(*) from private.auth_attempts where kind = 'invite_redeem' and not succeeded;  -- > 0 after a wrong code
--   delete from household_members where user_id = auth.uid();      -- 42501 (as a client)
--   update household_members set member_id = '<other card>';      -- 42501 (as a client)
--   select p.oid::regprocedure from pg_proc p where p.pronamespace = 'public'::regnamespace
--     and p.prorettype <> 'trigger'::regtype and has_function_privilege('anon', p.oid, 'execute');  -- 0 rows
