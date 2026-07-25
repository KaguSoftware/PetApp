-- 0028: Household lifecycle RPCs — create / leave / remove / roles / transfer,
-- plus the service-role prepare_account_deletion that makes deleting an
-- account safe for co-members.
--
-- All SECURITY DEFINER: role checks live in the function bodies (0026's
-- column grants keep clients from editing household_members.role directly).
-- Depends on 0026 (has_household_role, owner_id UNIQUE dropped).
--
-- WEB-DEMO COMPAT: purely additive — new functions only. The web demo's
-- delete-account API should eventually call prepare_account_deletion too;
-- until then its solo-user deletions behave exactly as before (cascade), and
-- shared-household deletions are the same known hazard 0011 always had.

-- create_household ---------------------------------------------------------------
-- Fresh households start EMPTY (0 coins/xp/streak, no demo data) — the mobile
-- onboarding walks the user through naming, first pet, and inviting family.
-- The on_household_created trigger (0011) auto-inserts the owner membership.

create or replace function public.create_household(hname text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  h_id uuid;
  card_id uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  -- Owning multiple households is allowed ONLY through this RPC: the flag
  -- lets the insert pass 0026's households_single_owned_guard (which keeps
  -- raising the web demo's expected 23505 on direct duplicate inserts).
  perform set_config('petpal.allow_multi_household', 'on', true);

  insert into households (owner_id, name, coins, xp, streak, units)
  values (uid, coalesce(nullif(trim(hname), ''), 'My household'), 0, 0, 0, 'kg')
  returning id into h_id;

  insert into members (household_id, name, emoji, role, gradient_from, gradient_to)
  values (
    h_id,
    coalesce((select raw_user_meta_data ->> 'name' from auth.users where id = uid), 'You'),
    '🧑‍💻', 'Owner', 'oklch(0.62 0.16 258)', 'oklch(0.5 0.18 280)'
  )
  returning id into card_id;

  update household_members set member_id = card_id
    where household_id = h_id and user_id = uid;
  update households set current_member_id = card_id where id = h_id;

  insert into user_profiles (user_id, active_household_id)
  values (uid, h_id)
  on conflict (user_id) do update set active_household_id = excluded.active_household_id;

  return h_id;
end;
$$;
revoke all on function public.create_household(text) from public;
grant execute on function public.create_household(text) to authenticated;

-- leave_household -----------------------------------------------------------------
-- The leaver's card stays as an unclaimed card so their logged history keeps
-- its attribution (owner decision 2026-07-25). Owners must transfer or delete.

create or replace function public.leave_household(hid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  my_role text;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  select role into my_role from household_members
    where household_id = hid and user_id = uid;
  if not found then
    raise exception 'not a member of this household' using errcode = 'P0002';
  end if;
  if my_role = 'owner' then
    raise exception 'transfer ownership or delete the household first' using errcode = '42501';
  end if;

  delete from household_members where household_id = hid and user_id = uid;

  update user_profiles
    set active_household_id = (
      select household_id from household_members
      where user_id = uid order by joined_at asc limit 1
    )
    where user_id = uid and active_household_id = hid;
end;
$$;
revoke all on function public.leave_household(uuid) from public;
grant execute on function public.leave_household(uuid) to authenticated;

-- remove_household_member ------------------------------------------------------------
-- admin+ removes members; only the owner removes admins; nobody removes the
-- owner. The removed account's card stays as an unclaimed card (history).

create or replace function public.remove_household_member(hid uuid, target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  target_role text;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if target_user = uid then
    raise exception 'use leave_household to leave' using errcode = '22023';
  end if;
  if not public.has_household_role(hid, array['owner', 'admin']) then
    raise exception 'only the owner or an admin can remove members' using errcode = '42501';
  end if;
  select role into target_role from household_members
    where household_id = hid and user_id = target_user;
  if not found then
    raise exception 'not a member of this household' using errcode = 'P0002';
  end if;
  if target_role = 'owner' then
    raise exception 'the owner cannot be removed' using errcode = '42501';
  end if;
  if target_role = 'admin' and not public.has_household_role(hid, array['owner']) then
    raise exception 'only the owner can remove an admin' using errcode = '42501';
  end if;

  delete from household_members where household_id = hid and user_id = target_user;

  update user_profiles
    set active_household_id = (
      select household_id from household_members
      where user_id = target_user order by joined_at asc limit 1
    )
    where user_id = target_user and active_household_id = hid;
end;
$$;
revoke all on function public.remove_household_member(uuid, uuid) from public;
grant execute on function public.remove_household_member(uuid, uuid) to authenticated;

-- set_member_role ---------------------------------------------------------------------
-- Owner-only (owner decision 2026-07-25: admins cannot mint admins).

create or replace function public.set_member_role(hid uuid, target_user uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  target_role text;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.has_household_role(hid, array['owner']) then
    raise exception 'only the owner can change roles' using errcode = '42501';
  end if;
  if new_role not in ('admin', 'member') then
    raise exception 'invalid role' using errcode = '22023';
  end if;
  select role into target_role from household_members
    where household_id = hid and user_id = target_user;
  if not found then
    raise exception 'not a member of this household' using errcode = 'P0002';
  end if;
  if target_role = 'owner' then
    raise exception 'use transfer_ownership to change the owner' using errcode = '42501';
  end if;

  update household_members set role = new_role
    where household_id = hid and user_id = target_user;
end;
$$;
revoke all on function public.set_member_role(uuid, uuid, text) from public;
grant execute on function public.set_member_role(uuid, uuid, text) to authenticated;

-- transfer_ownership --------------------------------------------------------------------
-- Atomic: households.owner_id + both role rows move together. The old owner
-- becomes an admin.

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
  if not public.has_household_role(hid, array['owner']) then
    raise exception 'only the owner can transfer ownership' using errcode = '42501';
  end if;
  if new_owner = uid then
    raise exception 'already the owner' using errcode = '22023';
  end if;
  if not exists (select 1 from household_members
                 where household_id = hid and user_id = new_owner) then
    raise exception 'not a member of this household' using errcode = 'P0002';
  end if;

  update households set owner_id = new_owner where id = hid;
  update household_members set role = 'owner'
    where household_id = hid and user_id = new_owner;
  update household_members set role = 'admin'
    where household_id = hid and user_id = uid;
end;
$$;
revoke all on function public.transfer_ownership(uuid, uuid) from public;
grant execute on function public.transfer_ownership(uuid, uuid) to authenticated;

-- prepare_account_deletion ------------------------------------------------------------
-- SERVICE-ROLE ONLY. Called by the delete-account Edge Function BEFORE
-- auth.admin.deleteUser so households.owner_id's ON DELETE CASCADE never
-- destroys a household other people still use:
--   * households where the user is the only human member → deleted outright
--   * households the user owns with co-members → longest-tenured admin (else
--     longest-tenured member) is promoted to owner
--   * remaining memberships → simply removed (card stays, unclaimed)
-- Also testable directly from the SQL editor: select prepare_account_deletion('<uid>');

create or replace function public.prepare_account_deletion(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  successor uuid;
begin
  for m in
    select hm.household_id, hm.role from household_members hm
    where hm.user_id = target_user
  loop
    if (select count(*) from household_members
        where household_id = m.household_id) = 1 then
      delete from households where id = m.household_id;
      continue;
    end if;

    if m.role = 'owner' then
      select user_id into successor from household_members
        where household_id = m.household_id and user_id <> target_user
        order by (role <> 'admin'), joined_at asc
        limit 1;
      update household_members set role = 'owner'
        where household_id = m.household_id and user_id = successor;
      update households set owner_id = successor where id = m.household_id;
    end if;

    delete from household_members
      where household_id = m.household_id and user_id = target_user;
  end loop;
end;
$$;
revoke all on function public.prepare_account_deletion(uuid) from public, authenticated, anon;
grant execute on function public.prepare_account_deletion(uuid) to service_role;

-- Safety net for EVERY deletion path (the mobile Edge Function calls the RPC
-- explicitly; the web demo's API route calls auth.admin.deleteUser directly):
-- run succession automatically right before an auth user row goes away.
-- prepare_account_deletion is idempotent, so the doubled call is harmless.

create or replace function public.prepare_account_deletion_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.prepare_account_deletion(old.id);
  return old;
end;
$$;

drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted
  before delete on auth.users
  for each row execute function public.prepare_account_deletion_trigger();
