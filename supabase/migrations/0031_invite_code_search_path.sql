-- 0031: Fix create_invite — 42883 "function gen_random_bytes(integer) does not exist".
--
-- 0027 pinned create_invite to `set search_path = public`, but the code
-- generator calls gen_random_bytes(1), which is a PGCRYPTO function. On a
-- Supabase project pgcrypto is installed into the `extensions` schema, so the
-- three `create extension if not exists pgcrypto` lines in 0016/0017/0018 are
-- silent no-ops and nothing ever puts it on the path — every create_invite call
-- raised 42883. (gen_random_uuid() in the same file kept working because since
-- PG13 it lives in pg_catalog, which is always implicitly on the search path.)
--
-- Fix: widen the pinned search_path to `public, extensions`. Postgres silently
-- ignores schemas in search_path that don't exist, so this also resolves on a
-- plain Postgres install where pgcrypto sits in public — which is why the call
-- stays UNQUALIFIED rather than becoming extensions.gen_random_bytes(1).
--
-- RULE for future migrations: any SECURITY DEFINER function that touches
-- pgcrypto (gen_random_bytes, digest, crypt, hmac, …) must use
-- `set search_path = public, extensions`. Every other SECURITY DEFINER function
-- in this repo is `set search_path = public` and stays that way — none of them
-- call pgcrypto.
--
-- Body is otherwise byte-identical to 0027.

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
      return inv;
    exception when unique_violation then
      -- collision — roll a new code
    end;
  end loop;
  raise exception 'could not generate a unique invite code';
end;
$$;
-- create or replace preserves ACLs; restated so the migration is self-contained.
revoke all on function public.create_invite(uuid, text, uuid, integer, integer) from public;
grant execute on function public.create_invite(uuid, text, uuid, integer, integer) to authenticated;
