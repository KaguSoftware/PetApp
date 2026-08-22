-- 0048: a shared attempt limiter, and its first two users.
--
-- WHY. Two RPCs accept a secret and answer "right or wrong" with no cost for
-- being wrong:
--   * redeem_invite — an 8-char code from a 31-char alphabet (~39 bits).
--     Supabase Auth's own rate limiting does NOT cover it: this goes through
--     /rest/v1/rpc/, a different path from /auth/v1.
--   * verify_family_password (0047) — a short, human-chosen family password.
--     Today an attacker would not bother, because the hash can simply be
--     SELECTed. The migration that closes that read path turns this RPC into
--     the oracle instead, so the limiter has to exist first or the change is a
--     downgrade, not an upgrade: offline guessing becomes online guessing with
--     no ceiling.
--
-- DESIGN.
--   * Attempts live in `private` (0045), so PostgREST cannot see the table at
--     all — no route, no policy to get wrong.
--   * Keyed on (kind, user_id, scope). Both callers require auth.uid(), so
--     there is always a user to key on and no anonymous bucket to flood.
--   * Only FAILURES count toward the limit; a success clears the bucket, so an
--     ordinary user who mistypes once and then gets it right is never slowed.
--   * The limit is enforced BEFORE the comparison and recorded AFTER it, in the
--     caller's transaction. There is no path where a wrong answer goes
--     unrecorded.
--   * Old rows are pruned opportunistically on write; no cron dependency.
--
-- NOT a defence against a distributed attacker with many accounts — that needs
-- IP-level limiting at the edge, which Supabase owns. This raises the cost of
-- the cheap attack, which is the one that actually happens.
--
-- Depends on 0045 (private schema), 0044 (write_audit_log), 0047
-- (verify_family_password).

create table if not exists private.auth_attempts (
  id           bigint generated always as identity primary key,
  kind         text not null check (kind in ('invite_redeem', 'family_password')),
  user_id      uuid not null references auth.users (id) on delete cascade,
  -- Household id for family_password; 'global' for invite_redeem, whose code
  -- space is not scoped to anything the caller has access to yet.
  scope        text not null,
  attempted_at timestamptz not null default now(),
  succeeded    boolean not null
);

create index if not exists auth_attempts_bucket_idx
  on private.auth_attempts (kind, user_id, scope, attempted_at desc);

alter table private.auth_attempts enable row level security;
-- No policies, same posture as private.audit_log: owner + service_role only.
revoke all on table private.auth_attempts from anon, authenticated;

-- enforce_attempt_limit -------------------------------------------------------
-- Raises P0004 when the caller has burned through its failures. Callers should
-- surface this as "too many attempts, try again later" and NOT as a wrong
-- password — the distinction matters to an honest user.

create or replace function public.enforce_attempt_limit(
  p_kind   text,
  p_scope  text,
  p_max    integer,
  p_window interval
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  fails integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select count(*) into fails
  from private.auth_attempts
  where kind = p_kind
    and user_id = uid
    and scope = p_scope
    and not succeeded
    and attempted_at > now() - p_window;

  if fails >= p_max then
    raise exception 'too many attempts, try again later' using errcode = 'P0004';
  end if;
end;
$$;
revoke all on function public.enforce_attempt_limit(text, text, integer, interval)
  from public, anon, authenticated;

-- record_attempt --------------------------------------------------------------

create or replace function public.record_attempt(
  p_kind      text,
  p_scope     text,
  p_succeeded boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return;
  end if;

  insert into private.auth_attempts (kind, user_id, scope, succeeded)
  values (p_kind, uid, p_scope, p_succeeded);

  if p_succeeded then
    -- A correct answer clears the bucket: the next honest mistake starts from
    -- zero rather than from whatever this user accumulated last month.
    delete from private.auth_attempts
    where kind = p_kind and user_id = uid and scope = p_scope and not succeeded;
  end if;

  -- Opportunistic prune, so the table never needs a scheduled job.
  delete from private.auth_attempts
  where user_id = uid and attempted_at < now() - interval '1 day';
end;
$$;
revoke all on function public.record_attempt(text, text, boolean)
  from public, anon, authenticated;

-- verify_family_password (replaces 0047's) ------------------------------------
-- 10 failures per 15 minutes per household. A family password is short and
-- human-chosen; this is the number that makes guessing it pointless without
-- annoying someone who fat-fingers it on a phone keyboard.

create or replace function public.verify_family_password(hid uuid, input_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  stored text;
  ok boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.is_household_member(hid) then
    raise exception 'not a member of this household' using errcode = '42501';
  end if;

  perform public.enforce_attempt_limit('family_password', hid::text, 10, interval '15 minutes');

  select family_password_hash into stored from households where id = hid;
  if stored is null then
    return true;   -- nothing set, nothing to guess: not an attempt
  end if;

  ok := input_hash is not null and lower(input_hash) = lower(stored);
  perform public.record_attempt('family_password', hid::text, ok);
  return ok;
end;
$$;
revoke all on function public.verify_family_password(uuid, text) from public, anon;
grant execute on function public.verify_family_password(uuid, text) to authenticated;

-- set_family_password (replaces 0047's) ---------------------------------------
-- The change flow proves the current password too, so it is the same oracle
-- with a different name. Same bucket, deliberately: an attacker must not be
-- able to spend 10 guesses here and another 10 on verify.

create or replace function public.set_family_password(
  hid uuid,
  new_hash text,
  current_hash text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  stored text;
  ok boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.is_household_member(hid) then
    raise exception 'not a member of this household' using errcode = '42501';
  end if;
  if new_hash is not null and new_hash !~ '^[0-9a-fA-F]{64}$' then
    raise exception 'invalid password hash' using errcode = '22023';
  end if;

  select family_password_hash into stored from households where id = hid;

  if stored is not null then
    perform public.enforce_attempt_limit('family_password', hid::text, 10, interval '15 minutes');
    ok := current_hash is not null and lower(current_hash) = lower(stored);
    perform public.record_attempt('family_password', hid::text, ok);
    if not ok then
      raise exception 'incorrect current password' using errcode = '28P01';
    end if;
  end if;

  update households
    set family_password_hash = case when new_hash is null then null else lower(new_hash) end
    where id = hid;
end;
$$;
revoke all on function public.set_family_password(uuid, text, text) from public, anon;
grant execute on function public.set_family_password(uuid, text, text) to authenticated;

-- redeem_invite (replaces 0044's) ---------------------------------------------
-- 10 failures per hour, scoped 'global'. Only a code that does not resolve
-- counts as a failure — an expired or revoked code is a real code the user was
-- given, not a guess, so it must not consume the honest user's budget.
--
-- Body is 0044's, unchanged apart from the three limiter lines.

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

  perform public.enforce_attempt_limit('invite_redeem', 'global', 10, interval '1 hour');

  normalized := upper(regexp_replace(coalesce(invite_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if length(normalized) <> 8 then
    perform public.record_attempt('invite_redeem', 'global', false);
    raise exception 'invite not found' using errcode = 'P0002';
  end if;

  select * into inv from household_invites
    where code = substr(normalized, 1, 4) || '-' || substr(normalized, 5, 4);
  if not found then
    perform public.record_attempt('invite_redeem', 'global', false);
    raise exception 'invite not found' using errcode = 'P0002';
  end if;

  -- Found a real code: the guessing game is over, whatever its state.
  perform public.record_attempt('invite_redeem', 'global', true);

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
