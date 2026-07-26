-- 0033: Two unrelated gaps closed together.
--
-- (a) members (the family "cards") had NO write authorisation at all. `editMember`
--     is a plain UPDATE, so any household member could rename another member's
--     card — or set its free-text `role` label to "Admin", which the app then
--     displayed as if it meant something. The client no longer offers that chip
--     (see components/RoleField.tsx), but the client was never the boundary.
--
-- (b) coin_grants backs the RevenueCat coin-pack webhook: a ledger keyed on the
--     store transaction id, so a replayed webhook cannot credit twice.
--
-- Depends on 0026 (has_household_role). WEB-DEMO COMPAT: the web demo edits
-- members through the same authenticated role and is subject to the same rule —
-- owner/admin, or your own linked card. That is exactly what its UI already
-- allows, so nothing there should start failing.

-- (a) members write guard ------------------------------------------------------
-- A trigger rather than column-level grants: the rule is about WHICH ROW you're
-- touching (is it your own card?), which a per-column grant cannot express.

create or replace function public.guard_member_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid := coalesce(new.household_id, old.household_id);
  target uuid := coalesce(new.id, old.id);
begin
  -- Service role / SECURITY DEFINER RPCs (redeem_invite, create_household,
  -- prepare_account_deletion) run without an auth.uid() — never block those.
  if auth.uid() is null then
    return coalesce(new, old);
  end if;

  if public.has_household_role(hid, array['owner', 'admin']) then
    return coalesce(new, old);
  end if;

  -- A plain member may edit exactly one card: the one their account is linked to.
  if exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid() and member_id = target
  ) then
    -- ...and may not move it to another household.
    if tg_op = 'UPDATE' and new.household_id is distinct from old.household_id then
      raise exception 'cannot move a card between households' using errcode = '42501';
    end if;
    -- Deleting your own card would orphan your membership; leave_household is
    -- the supported path.
    if tg_op = 'DELETE' then
      raise exception 'only the owner or an admin can remove a card' using errcode = '42501';
    end if;
    return new;
  end if;

  raise exception 'only the owner or an admin can manage family cards' using errcode = '42501';
end;
$$;

drop trigger if exists members_write_guard on public.members;
create trigger members_write_guard
  before insert or update or delete on public.members
  for each row execute function public.guard_member_write();

-- (b) coin_grants --------------------------------------------------------------
-- Written ONLY by the rc-webhook edge function (service role). RLS is enabled
-- with no policies at all, so authenticated clients can neither read nor write
-- it — a client that could insert here could mint currency.

create table if not exists coin_grants (
  -- RevenueCat's transaction id. PRIMARY KEY is the idempotency: a replayed
  -- webhook hits a unique violation and the function no-ops.
  rc_transaction_id text primary key,
  user_id uuid references auth.users (id) on delete set null,
  household_id uuid references households (id) on delete cascade,
  product_id text not null,
  coins integer not null check (coins > 0),
  created_at timestamptz not null default now()
);
create index if not exists coin_grants_household_id_idx on coin_grants (household_id);

alter table coin_grants enable row level security;
revoke all on table public.coin_grants from authenticated, anon;

-- RELATIVE credit. The clients write households.coins as an ABSOLUTE value on a
-- 250ms debounce, so an absolute write from the webhook would clobber any taps
-- that happened while the store sheet was open. `coins = coins + amount` under
-- the row lock cannot lose an increment.
--
-- Service-role only: EXECUTE is revoked from authenticated, so a client cannot
-- call this to mint coins. The webhook's service-role key bypasses the revoke.

create or replace function public.grant_household_coins(hid uuid, amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_total integer;
begin
  if amount is null or amount <= 0 then
    raise exception 'amount must be positive' using errcode = '22023';
  end if;
  update households set coins = coalesce(coins, 0) + amount
    where id = hid
    returning coins into new_total;
  if not found then
    raise exception 'household not found' using errcode = 'P0002';
  end if;
  return new_total;
end;
$$;
revoke all on function public.grant_household_coins(uuid, integer) from public, authenticated, anon;
