-- 0037: Invite approval — a new member's invite code no longer grants access
-- immediately. Redeeming a code now files a household_join_requests row;
-- the household's owner/admin must approve it before household_members gets
-- a row (and before RLS grants anything). Depends on 0027 (household_invites,
-- redeem_invite) and 0026 (has_household_role).

create table if not exists household_join_requests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  invite_id uuid not null references household_invites (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('member', 'admin')),
  target_member_id uuid references members (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users (id)
);
create index if not exists household_join_requests_household_id_idx
  on household_join_requests (household_id);
-- One outstanding request per (household, user) — re-redeeming while pending
-- is a no-op, not a duplicate row.
create unique index if not exists household_join_requests_pending_uniq
  on household_join_requests (household_id, user_id) where status = 'pending';

alter table household_join_requests enable row level security;

-- Requester can see their own request (to know they're waiting); owner/admin
-- can see every request for their household. All writes go through the
-- SECURITY DEFINER RPCs below — no insert/update/delete policies on purpose.
drop policy if exists "see own or admin" on household_join_requests;
create policy "see own or admin" on household_join_requests
  for select using (
    user_id = auth.uid() or public.has_household_role(household_id, array['owner', 'admin'])
  );

-- redeem_invite (replaces the 0027 version) --------------------------------------
-- Existing-member redeems stay an immediate, idempotent household switch.
-- Brand-new redeems now file a pending request instead of joining outright.
-- Returns jsonb: {"household_id": uuid, "status": "active"|"pending"}.

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
    return jsonb_build_object('household_id', inv.household_id, 'status', 'active');
  end if;

  insert into household_join_requests (household_id, invite_id, user_id, role, target_member_id)
  values (inv.household_id, inv.id, uid, inv.role, inv.target_member_id)
  on conflict (household_id, user_id) where status = 'pending' do nothing;

  return jsonb_build_object('household_id', inv.household_id, 'status', 'pending');
end;
$$;
revoke all on function public.redeem_invite(text) from public;
grant execute on function public.redeem_invite(text) to authenticated;

-- approve_join_request -------------------------------------------------------------
-- Owner/admin only. Performs what redeem_invite used to do inline: join
-- household_members, claim/mint the member card, bump invite use_count, and
-- switch the requester's active household.

create or replace function public.approve_join_request(request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  req household_join_requests;
  card_id uuid;
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

  return req.household_id;
end;
$$;
revoke all on function public.approve_join_request(uuid) from public;
grant execute on function public.approve_join_request(uuid) to authenticated;

-- list_join_requests ---------------------------------------------------------------
-- Owner/admin only. Client can't read auth.users directly to label a request
-- with the requester's name, so this SECURITY DEFINER RPC joins it server-side.

create or replace function public.list_join_requests(hid uuid)
returns table (id uuid, role text, requester_name text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_household_role(hid, array['owner', 'admin']) then
    raise exception 'only the owner or an admin can view join requests' using errcode = '42501';
  end if;
  return query
    select r.id, r.role, u.raw_user_meta_data ->> 'name' as requester_name, r.created_at
    from household_join_requests r
    join auth.users u on u.id = r.user_id
    where r.household_id = hid and r.status = 'pending'
    order by r.created_at desc;
end;
$$;
revoke all on function public.list_join_requests(uuid) from public;
grant execute on function public.list_join_requests(uuid) to authenticated;

-- reject_join_request ---------------------------------------------------------------

create or replace function public.reject_join_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  st text;
begin
  select household_id, status into hid, st from household_join_requests where id = request_id;
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
end;
$$;
revoke all on function public.reject_join_request(uuid) from public;
grant execute on function public.reject_join_request(uuid) to authenticated;
