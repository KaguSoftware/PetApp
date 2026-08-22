-- 0044: audit_log — an append-only record of the irreversible / authority-
-- changing things that happen in a household.
--
-- WHY: until now "who removed that member / who changed that role / who was
-- handed the household" had no answer anywhere. household_members only holds
-- the CURRENT state, and every one of these RPCs deletes or overwrites the row
-- that would have told the story.
--
-- DESIGN (owner decisions 2026-08-22):
--   * RLS is ON and there are ZERO policies. Not "restrictive policies" — none
--     at all. In Postgres, RLS-on + no-policy = every non-bypassing role sees
--     nothing and can write nothing. Two roles get through:
--       - the table OWNER (postgres), which is what every SECURITY DEFINER RPC
--         below runs as → that is the ONLY write path;
--       - service_role, which carries BYPASSRLS on Supabase → the only read path.
--     `alter table ... force row level security` is deliberately NOT used: it
--     would subject the owner to RLS too and, with no policies, would make the
--     RPCs' own inserts fail.
--   * Grants are revoked from anon/authenticated as well, so the table is
--     unreachable even if a policy is ever added by accident.
--   * actor_user_id / target_user_id are ON DELETE SET NULL: deleting an
--     account anonymises its audit rows instead of erasing the record that the
--     action happened (GDPR erasure vs. audit integrity).
--   * household_id carries NO foreign key at all. A FK would force a choice
--     between cascade (deleting the household destroys the evidence that it was
--     deleted) and set null (the same evidence loses its subject). A plain uuid
--     keeps 'household.deleted' meaningful after the household is gone.
--   * The insert is part of the caller's transaction. There is no exception
--     handler around it, no "best effort" path: if the log cannot be written,
--     the action it describes does not happen either.
--
-- NEVER LOGGED: invite CODES (only invite ids), family_password_hash, tokens,
-- e-mail addresses, member/pet names. The metadata CHECK below turns that from
-- a convention into a constraint.
--
-- Depends on 0026 (has_household_role), 0027/0031 (invites), 0028 (household
-- lifecycle), 0037 (join requests), 0039 (pet transfer).
-- Purely additive: no existing table, column, policy or grant is altered — the
-- nine RPCs are re-created byte-identical apart from their audit line, so the
-- web demo, which calls the same RPCs, is unaffected.

-- ---------------------------------------------------------------- table ----

create table if not exists audit_log (
  id             bigint generated always as identity primary key,
  created_at     timestamptz not null default now(),
  action         text not null,
  -- Who did it. Null = the actor's account has since been deleted, or the
  -- action was performed by the backend itself (service_role).
  actor_user_id  uuid references auth.users (id) on delete set null,
  -- Which household it happened in. Intentionally FK-less — see header.
  household_id   uuid,
  -- Who it was done TO (removed member, promoted member, new owner).
  target_user_id uuid references auth.users (id) on delete set null,
  -- The non-user subject: invite id, join request id, pet id.
  target_id      uuid,
  metadata       jsonb not null default '{}'::jsonb,

  -- Free text would rot into an unqueryable mess within a month.
  constraint audit_log_action_check check (action in (
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
    'account.deletion_prepared'
  )),

  -- Hard stop against a future migration casually logging a secret. `?|` tests
  -- top-level keys, which is where such a value would land.
  constraint audit_log_metadata_no_secrets check (
    -- jsonb_exists_any(), not the `?|` operator: a bare `?` in DDL trips
    -- clients that treat it as a bind placeholder.
    not jsonb_exists_any(metadata, array[
      'code', 'invite_code', 'token', 'access_token', 'refresh_token',
      'password', 'family_password', 'family_password_hash', 'hash',
      'email', 'e_mail', 'phone', 'secret', 'key', 'jwt'
    ])
  ),
  constraint audit_log_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists audit_log_household_idx
  on audit_log (household_id, created_at desc);
create index if not exists audit_log_actor_idx
  on audit_log (actor_user_id, created_at desc);
create index if not exists audit_log_action_idx
  on audit_log (action, created_at desc);

alter table audit_log enable row level security;
-- No policies. On purpose. Do not add one without revisiting the header.

-- Supabase's default privileges hand new public tables to anon/authenticated;
-- take them back. RLS already blocks them — this is the second lock.
revoke all on table audit_log from anon, authenticated;
revoke all on sequence audit_log_id_seq from anon, authenticated;

-- ------------------------------------------------------------- writer ------
-- One writer, so every call site produces the same row shape. SECURITY DEFINER
-- and executable only by the table owner / service_role — the RPCs below reach
-- it as postgres, never as the calling user.

create or replace function public.write_audit_log(
  p_action      text,
  p_household   uuid default null,
  p_target_user uuid default null,
  p_target_id   uuid default null,
  p_metadata    jsonb default '{}'::jsonb,
  p_actor       uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_log (action, actor_user_id, household_id, target_user_id, target_id, metadata)
  values (p_action, coalesce(p_actor, auth.uid()), p_household, p_target_user, p_target_id,
          coalesce(p_metadata, '{}'::jsonb));
end;
$$;
revoke all on function public.write_audit_log(text, uuid, uuid, uuid, jsonb, uuid)
  from public, anon, authenticated;

-- =================================================================== RPCs ===
-- Each function below is the current definition (0028 / 0031 / 0037 / 0039)
-- with a write_audit_log call added. Nothing else changed.

-- remove_household_member (0028) ---------------------------------------------

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

  perform public.write_audit_log(
    'member.removed', hid, target_user, null,
    jsonb_build_object('removed_role', target_role)
  );
end;
$$;
revoke all on function public.remove_household_member(uuid, uuid) from public;
grant execute on function public.remove_household_member(uuid, uuid) to authenticated;

-- set_member_role (0028) ------------------------------------------------------

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

  perform public.write_audit_log(
    'member.role_changed', hid, target_user, null,
    jsonb_build_object('from_role', target_role, 'to_role', new_role)
  );
end;
$$;
revoke all on function public.set_member_role(uuid, uuid, text) from public;
grant execute on function public.set_member_role(uuid, uuid, text) to authenticated;

-- transfer_ownership (0028) ---------------------------------------------------

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

  perform public.write_audit_log(
    'household.ownership_transferred', hid, new_owner, null,
    jsonb_build_object('previous_owner_demoted_to', 'admin', 'voluntary', true)
  );
end;
$$;
revoke all on function public.transfer_ownership(uuid, uuid) from public;
grant execute on function public.transfer_ownership(uuid, uuid) to authenticated;

-- delete_household (0028) -----------------------------------------------------

create or replace function public.delete_household(hid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  member_count integer;
  pet_count integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.has_household_role(hid, array['owner']) then
    raise exception 'only the owner can delete a household' using errcode = '42501';
  end if;

  -- Counted BEFORE the delete — afterwards both rows are gone. The log row
  -- survives the delete because audit_log.household_id has no FK.
  select count(*) into member_count from household_members where household_id = hid;
  select count(*) into pet_count from pets where household_id = hid;

  perform public.write_audit_log(
    'household.deleted', hid, null, null,
    jsonb_build_object('member_count', member_count, 'pet_count', pet_count,
                       'reason', 'owner_request')
  );

  delete from households where id = hid;

  -- Repoint anyone whose active household just vanished (the FK is ON DELETE
  -- SET NULL, so their pointer would otherwise be null with memberships left).
  update user_profiles p
    set active_household_id = (
      select household_id from household_members
      where user_id = p.user_id order by joined_at asc limit 1
    )
    where p.active_household_id is null;
end;
$$;
revoke all on function public.delete_household(uuid) from public;
grant execute on function public.delete_household(uuid) to authenticated;

-- create_invite (0031 — keeps `public, extensions` for pgcrypto) --------------

create or replace function public.create_invite(
  hid uuid,
  invite_role text default 'member',
  target uuid default null,
  ttl_hours integer default 168,
  uses integer default null
)
returns household_invites
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := auth.uid();
  -- No I/L/O/0/1 — every character survives handwriting and group-chat fonts.
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  new_code text;
  inv household_invites;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.has_household_role(hid, array['owner', 'admin']) then
    raise exception 'only the owner or an admin can create invites' using errcode = '42501';
  end if;
  if invite_role not in ('member', 'admin') then
    raise exception 'invalid invite role' using errcode = '22023';
  end if;
  if invite_role = 'admin' and not public.has_household_role(hid, array['owner']) then
    raise exception 'only the owner can create admin invites' using errcode = '42501';
  end if;

  if target is not null then
    if not exists (select 1 from members where id = target and household_id = hid) then
      raise exception 'card does not belong to this household' using errcode = '22023';
    end if;
    if exists (select 1 from household_members where member_id = target) then
      raise exception 'card is already claimed by an account' using errcode = '22023';
    end if;
    uses := 1;
  end if;

  ttl_hours := least(greatest(coalesce(ttl_hours, 168), 1), 24 * 365);

  -- 8 chars from a 31-char alphabet ≈ 39 bits — plenty for codes that expire
  -- in days and are rate-limited by the unique retry loop. (The tiny modulo
  -- bias of get_byte % 31 is irrelevant at this threat model.)
  for attempt in 1..8 loop
    select substr(a, 1, 4) || '-' || substr(a, 5, 4) into new_code from (
      select string_agg(substr(alphabet, (get_byte(gen_random_bytes(1), 0) % 31) + 1, 1), '') as a
      from generate_series(1, 8)
    ) s;
    begin
      insert into household_invites (household_id, code, role, target_member_id, created_by, expires_at, max_uses)
      values (hid, new_code, invite_role, target, uid, now() + make_interval(hours => ttl_hours), uses)
      returning * into inv;

      -- inv.id only. The CODE IS A BEARER CREDENTIAL and never enters the log.
      perform public.write_audit_log(
        'invite.created', hid, null, inv.id,
        jsonb_build_object('invite_role', inv.role,
                           'claims_existing_card', inv.target_member_id is not null,
                           'max_uses', inv.max_uses,
                           'expires_at', inv.expires_at)
      );

      return inv;
    exception when unique_violation then
      -- collision — roll a new code
    end;
  end loop;
  raise exception 'could not generate a unique invite code';
end;
$$;
revoke all on function public.create_invite(uuid, text, uuid, integer, integer) from public;
grant execute on function public.create_invite(uuid, text, uuid, integer, integer) to authenticated;

-- revoke_invite (0027) --------------------------------------------------------

create or replace function public.revoke_invite(invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
begin
  select household_id into hid from household_invites where id = invite_id;
  if not found then
    raise exception 'invite not found' using errcode = 'P0002';
  end if;
  if not public.has_household_role(hid, array['owner', 'admin']) then
    raise exception 'only the owner or an admin can revoke invites' using errcode = '42501';
  end if;
  update household_invites set revoked_at = now()
    where id = invite_id and revoked_at is null;

  perform public.write_audit_log('invite.revoked', hid, null, invite_id);
end;
$$;
revoke all on function public.revoke_invite(uuid) from public;
grant execute on function public.revoke_invite(uuid) to authenticated;

-- redeem_invite (0037) --------------------------------------------------------
-- Since 0037 this only FILES a request; it grants nothing. Logged anyway so an
-- invite code being sprayed at the household is visible, but note that the
-- access-granting event is join_request.approved below.

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
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  normalized := upper(regexp_replace(coalesce(invite_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if length(normalized) <> 8 then
    raise exception 'invite not found' using errcode = 'P0002';
  end if;

  select * into inv from household_invites
    where code = substr(normalized, 1, 4) || '-' || substr(normalized, 5, 4);
  if not found then
    raise exception 'invite not found' using errcode = 'P0002';
  end if;
  if inv.revoked_at is not null
     or inv.expires_at <= now()
     or (inv.max_uses is not null and inv.use_count >= inv.max_uses) then
    raise exception 'invite expired or revoked' using errcode = 'P0003';
  end if;

  -- Idempotent for existing members: just switch them there, no approval needed.
  if exists (select 1 from household_members
             where household_id = inv.household_id and user_id = uid) then
    insert into user_profiles (user_id, active_household_id)
    values (uid, inv.household_id)
    on conflict (user_id) do update set active_household_id = excluded.active_household_id;

    perform public.write_audit_log(
      'invite.redeemed', inv.household_id, null, inv.id,
      jsonb_build_object('outcome', 'already_member')
    );
    return jsonb_build_object('household_id', inv.household_id, 'status', 'active');
  end if;

  insert into household_join_requests (household_id, invite_id, user_id, role, target_member_id)
  values (inv.household_id, inv.id, uid, inv.role, inv.target_member_id)
  on conflict (household_id, user_id) where status = 'pending' do nothing;

  perform public.write_audit_log(
    'invite.redeemed', inv.household_id, null, inv.id,
    jsonb_build_object('outcome', 'request_filed', 'requested_role', inv.role)
  );
  return jsonb_build_object('household_id', inv.household_id, 'status', 'pending');
end;
$$;
revoke all on function public.redeem_invite(text) from public;
grant execute on function public.redeem_invite(text) to authenticated;

-- approve_join_request (0037) -------------------------------------------------
-- NOT on the requested list, added deliberately: after 0037 this — not
-- redeem_invite — is the moment an outsider actually gains access to a
-- household's data. Auditing the redeem but not the approval would leave the
-- single most important grant unlogged.

create or replace function public.approve_join_request(request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  req household_join_requests;
  card_id uuid;
  did_join boolean := false;
begin
  select * into req from household_join_requests where id = request_id;
  if not found then
    raise exception 'request not found' using errcode = 'P0002';
  end if;
  if not public.has_household_role(req.household_id, array['owner', 'admin']) then
    raise exception 'only the owner or an admin can approve requests' using errcode = '42501';
  end if;
  if req.status <> 'pending' then
    raise exception 'request already decided' using errcode = '22023';
  end if;

  -- Idempotent guard: another invite/request may have added them meanwhile.
  if not exists (select 1 from household_members
                 where household_id = req.household_id and user_id = req.user_id) then
    insert into household_members (household_id, user_id, role)
    values (req.household_id, req.user_id, req.role);
    did_join := true;

    if req.target_member_id is not null
       and exists (select 1 from members
                   where id = req.target_member_id and household_id = req.household_id)
       and not exists (select 1 from household_members where member_id = req.target_member_id) then
      card_id := req.target_member_id;
    else
      insert into members (household_id, name, emoji, role, gradient_from, gradient_to)
      values (
        req.household_id,
        coalesce((select raw_user_meta_data ->> 'name' from auth.users where id = req.user_id), 'New member'),
        '🧑', 'Member', 'oklch(0.6 0.13 200)', 'oklch(0.48 0.13 240)'
      )
      returning id into card_id;
    end if;
    update household_members set member_id = card_id
      where household_id = req.household_id and user_id = req.user_id;

    update household_invites set use_count = use_count + 1 where id = req.invite_id;
  end if;

  insert into user_profiles (user_id, active_household_id)
  values (req.user_id, req.household_id)
  on conflict (user_id) do update set active_household_id = excluded.active_household_id;

  update household_join_requests
    set status = 'approved', decided_at = now(), decided_by = auth.uid()
    where id = request_id;

  perform public.write_audit_log(
    'join_request.approved', req.household_id, req.user_id, request_id,
    jsonb_build_object('granted_role', req.role, 'membership_created', did_join,
                       'invite_id', req.invite_id)
  );

  return req.household_id;
end;
$$;
revoke all on function public.approve_join_request(uuid) from public;
grant execute on function public.approve_join_request(uuid) to authenticated;

-- reject_join_request (0037) --------------------------------------------------
-- Same reasoning as approve: an approval trail with no rejections cannot
-- distinguish "nobody asked" from "somebody asked and was turned away".

create or replace function public.reject_join_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  st text;
  requester uuid;
begin
  select household_id, status, user_id into hid, st, requester
    from household_join_requests where id = request_id;
  if not found then
    raise exception 'request not found' using errcode = 'P0002';
  end if;
  if not public.has_household_role(hid, array['owner', 'admin']) then
    raise exception 'only the owner or an admin can reject requests' using errcode = '42501';
  end if;
  if st <> 'pending' then
    raise exception 'request already decided' using errcode = '22023';
  end if;
  update household_join_requests
    set status = 'rejected', decided_at = now(), decided_by = auth.uid()
    where id = request_id;

  perform public.write_audit_log('join_request.rejected', hid, requester, request_id);
end;
$$;
revoke all on function public.reject_join_request(uuid) from public;
grant execute on function public.reject_join_request(uuid) to authenticated;

-- accept_pet_transfer (0039) --------------------------------------------------

create or replace function public.accept_pet_transfer(request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  req pet_transfer_requests;
  cur uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into req from pet_transfer_requests where id = request_id;
  if req.id is null then
    raise exception 'request not found' using errcode = 'P0002';
  end if;

  if not public.has_household_role(req.to_household_id, array['owner', 'admin']) then
    raise exception 'only the owner or an admin can accept a pet transfer' using errcode = '42501';
  end if;

  if req.status <> 'pending' then
    raise exception 'request already decided' using errcode = '22023';
  end if;

  if req.expires_at <= now() then
    raise exception 'transfer request expired' using errcode = 'P0003';
  end if;

  -- Lock the pet and re-check where it actually is: the source household may
  -- have moved it elsewhere, or deleted it, since the offer was filed.
  select household_id into cur from pets where id = req.pet_id for update;
  if cur is null then
    raise exception 'pet no longer exists' using errcode = 'P0002';
  end if;
  if cur <> req.from_household_id then
    raise exception 'pet has already moved' using errcode = '22023';
  end if;

  -- (a) Adopt any vet the pet's reminders point at into the DESTINATION's
  --     booked list, BEFORE the reminders move, so "Checkup with Dr X" still
  --     resolves on the new side. `vets` is a static client-side catalogue, so
  --     the id is meaningful in any household.
  insert into booked_vets (household_id, vet_id)
  select distinct req.to_household_id, r.vet_id
  from reminders r
  where r.pet_id = req.pet_id and r.vet_id is not null
  on conflict do nothing;

  -- (b) Prune the SOURCE household's home-screen shortcuts. `shortcuts.pet_ids`
  --     is a uuid[] with no FK, so nothing cascades on its own. Med shortcuts
  --     go first: their med_id is about to leave with the pet.
  delete from shortcuts
  where household_id = req.from_household_id
    and med_id in (select id from meds where pet_id = req.pet_id);

  delete from shortcuts
  where household_id = req.from_household_id
    and pet_ids = array[req.pet_id]::uuid[];

  update shortcuts
  set pet_ids = array_remove(pet_ids, req.pet_id)
  where household_id = req.from_household_id
    and req.pet_id = any (pet_ids);

  -- (c) The three tables carrying BOTH household_id and pet_id. Every predicate
  --     names the old household explicitly, so this is idempotent.
  update activities
  set household_id = req.to_household_id
  where pet_id = req.pet_id and household_id = req.from_household_id;

  update reminders
  set household_id = req.to_household_id
  where pet_id = req.pet_id and household_id = req.from_household_id;

  update care_schedules
  set household_id = req.to_household_id
  where pet_id = req.pet_id and household_id = req.from_household_id;

  -- (d) The pet itself, LAST — so any interrupted state still reads as "the pet
  --     is in the source household", the safer thing to be caught in.
  --
  --     weights / supplies / meds / vaccinations / vet_visits are keyed on
  --     pet_id ALONE and carry no household_id, so they follow the pet with no
  --     statement here and their RLS (which joins through pets) flips with it.
  --     Same for the cosmetics: pets.owned and pets.equipped are columns on this
  --     very row, so accessories travel for free.
  update pets set household_id = req.to_household_id where id = req.pet_id;

  update pet_transfer_requests
  set status = 'accepted', decided_at = now(), decided_by = uid
  where id = request_id;

  -- Logged against the DESTINATION (whose admin acted); from_household_id is in
  -- the metadata so the same event is findable from the source side too.
  perform public.write_audit_log(
    'pet_transfer.accepted', req.to_household_id, null, req.pet_id,
    jsonb_build_object('from_household_id', req.from_household_id,
                       'request_id', request_id,
                       'requested_by', req.requested_by)
  );

  return req.pet_id;
end;
$$;

revoke all on function public.accept_pet_transfer(uuid) from public;
grant execute on function public.accept_pet_transfer(uuid) to authenticated;

-- prepare_account_deletion (0028) ---------------------------------------------
-- SERVICE-ROLE ONLY, and auth.uid() is null here, so every row is stamped with
-- the departing user as the actor via p_actor. Those stamps become NULL moments
-- later when auth.admin.deleteUser fires the ON DELETE SET NULL — deliberate:
-- the record of WHAT happened outlives the record of WHO, which is exactly the
-- GDPR-erasure-vs-audit-integrity line drawn in the header.
--
-- The succession itself is logged per household: silently promoting a stranger
-- to owner is the single largest authority change in the app.

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
