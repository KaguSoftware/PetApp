-- 0027: Real invites — short-lived, revocable, role-carrying codes.
--
-- Until now the "invite" was the household UUID itself: a permanent,
-- un-revocable bearer credential that join_household(uuid) accepts from any
-- authenticated user, always as 'member'. This adds a proper invite entity:
--
--   household_invites: code "XXXX-XXXX" (ambiguity-free alphabet), expiry
--   (default 7 days), optional max_uses, optional role (member|admin), and an
--   optional target card — so an invitee can CLAIM an existing unclaimed
--   member card (kids/grandparents cards created before they had accounts)
--   instead of getting a fresh card.
--
-- Depends on 0026 (has_household_role). Apply 0026 first.
--
-- WEB-DEMO COMPAT: purely additive. join_household(uuid) is untouched, so
-- existing web invite links (/join?f=<household uuid>) keep working.

create table if not exists household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  code text not null unique,
  role text not null default 'member' check (role in ('member', 'admin')),
  target_member_id uuid references members (id) on delete set null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  max_uses integer check (max_uses is null or max_uses > 0),
  use_count integer not null default 0,
  revoked_at timestamptz
);
create index if not exists household_invites_household_id_idx
  on household_invites (household_id);

alter table household_invites enable row level security;

-- Admins+ can list their household's invites. All writes go through the
-- SECURITY DEFINER RPCs below — no insert/update/delete policies on purpose.
drop policy if exists "admins see invites" on household_invites;
create policy "admins see invites" on household_invites
  for select using (public.has_household_role(household_id, array['owner', 'admin']));

-- create_invite ----------------------------------------------------------------
-- admin+ may invite members; ONLY the owner may mint admin invites.
-- Claim-a-card invites are forced single-use (two people can't claim one card).

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
set search_path = public
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

-- redeem_invite ------------------------------------------------------------------
-- Distinct errors so the client can speak plainly:
--   P0002 — no such code           P0003 — expired / revoked / used up
-- Already-a-member redeems are idempotent successes (no use_count bump).

create or replace function public.redeem_invite(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  normalized text;
  inv household_invites;
  card_id uuid;
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

  -- Idempotent for existing members: just switch them there.
  if exists (select 1 from household_members
             where household_id = inv.household_id and user_id = uid) then
    insert into user_profiles (user_id, active_household_id)
    values (uid, inv.household_id)
    on conflict (user_id) do update set active_household_id = excluded.active_household_id;
    return inv.household_id;
  end if;

  insert into household_members (household_id, user_id, role)
  values (inv.household_id, uid, inv.role);

  -- Card: claim the targeted one if it's still free, else mint a fresh one
  -- (same shape as join_household in 0011 — the clients normalize oklch).
  if inv.target_member_id is not null
     and exists (select 1 from members
                 where id = inv.target_member_id and household_id = inv.household_id)
     and not exists (select 1 from household_members where member_id = inv.target_member_id) then
    card_id := inv.target_member_id;
  else
    insert into members (household_id, name, emoji, role, gradient_from, gradient_to)
    values (
      inv.household_id,
      coalesce((select raw_user_meta_data ->> 'name' from auth.users where id = uid), 'New member'),
      '🧑', 'Member', 'oklch(0.6 0.13 200)', 'oklch(0.48 0.13 240)'
    )
    returning id into card_id;
  end if;
  update household_members set member_id = card_id
    where household_id = inv.household_id and user_id = uid;

  update household_invites set use_count = use_count + 1 where id = inv.id;

  insert into user_profiles (user_id, active_household_id)
  values (uid, inv.household_id)
  on conflict (user_id) do update set active_household_id = excluded.active_household_id;

  return inv.household_id;
end;
$$;
revoke all on function public.redeem_invite(text) from public;
grant execute on function public.redeem_invite(text) to authenticated;

-- revoke_invite -------------------------------------------------------------------

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
end;
$$;
revoke all on function public.revoke_invite(uuid) from public;
grant execute on function public.revoke_invite(uuid) to authenticated;
