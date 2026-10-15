-- 0054: fit pets/activities to the rebuilt app, and make attribution server-owned.
--
-- Found by snapshotting the live schema (supabase/diagnostics/schema_snapshot.sql):
--   * pets.emoji / gradient_from / gradient_to are NOT NULL with no default — the
--     old client always sent them; the new one has no cosmetics, so every insert
--     would fail 23502. They get defaults.
--   * pets.species was CHECKed to ('cat','dog'); onboarding offers more.
--   * activities.member_id is NOT NULL and was client-supplied, as was user_id:
--     a member could attribute a log to anyone. Both are now set by a trigger
--     from the caller's own membership, and the pet must belong to the row's
--     household (the RLS check only looked at household_id).
--   * activities had no index on ts / pet_id / user_id / med_id.

-- 1. pets ----------------------------------------------------------------------

alter table public.pets alter column emoji set default '🐾';
alter table public.pets alter column gradient_from set default '#FFE7E1';
alter table public.pets alter column gradient_to set default '#FFC34D';
alter table public.pets alter column breed set default '';

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.pets'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%species%'
  loop
    execute format('alter table public.pets drop constraint %I', c.conname);
  end loop;
end;
$$;
alter table public.pets add constraint pets_species_check
  check (species in ('dog', 'cat', 'rabbit', 'bird', 'fish', 'reptile', 'hamster', 'other'));

-- A pet never moves between households by a plain UPDATE (pet transfers are
-- retired with the rest of the multi-household features).
create or replace function public.guard_pet_household()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Trusted server-side code (SECURITY DEFINER RPCs, service role) is exempt.
  if current_user in ('authenticated', 'anon') and new.household_id is distinct from old.household_id then
    raise exception 'a pet cannot be moved between households' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists pets_household_guard on public.pets;
create trigger pets_household_guard
  before update of household_id on public.pets
  for each row execute function public.guard_pet_household();

-- 2. activities attribution ----------------------------------------------------

-- The caller's own member card in a household. DEFINER so it can read
-- household_members regardless of the caller's RLS.
create or replace function public.my_member_card(hid uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select member_id from public.household_members
  where household_id = hid and user_id = auth.uid();
$$;
revoke all on function public.my_member_card(uuid) from public, anon;
grant execute on function public.my_member_card(uuid) to authenticated;

-- INVOKER: it must see current_user to tell client writes from trusted ones (AGENTS.md).
create or replace function public.stamp_activity()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  card uuid;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if tg_op = 'UPDATE' then
    if new.household_id is distinct from old.household_id
       or new.pet_id is distinct from old.pet_id
       or new.user_id is distinct from old.user_id
       or new.member_id is distinct from old.member_id then
      raise exception 'only the time, amount and note of a log can change' using errcode = '42501';
    end if;
  else
    card := public.my_member_card(new.household_id);
    if card is null then
      raise exception 'you have no member card in this household' using errcode = '42501';
    end if;
    new.user_id := auth.uid();
    new.member_id := card;
    if not exists (select 1 from public.pets where id = new.pet_id and household_id = new.household_id) then
      raise exception 'pet does not belong to this household' using errcode = '42501';
    end if;
  end if;

  -- ts is epoch ms from the device clock. Phones drift, so allow generous skew;
  -- logging a day ahead is still refused.
  if new.ts > (extract(epoch from now()) * 1000)::bigint + 30 * 60 * 1000 then
    raise exception 'a log cannot be in the future' using errcode = '22023';
  end if;
  return new;
end;
$$;
drop trigger if exists activities_stamp on public.activities;
create trigger activities_stamp
  before insert or update on public.activities
  for each row execute function public.stamp_activity();

-- 3. indexes --------------------------------------------------------------------

create index if not exists activities_household_ts_idx on public.activities (household_id, ts desc);
create index if not exists activities_pet_ts_idx on public.activities (pet_id, ts desc);
create index if not exists activities_user_id_idx on public.activities (user_id);
create index if not exists activities_med_id_idx on public.activities (med_id);
create index if not exists weights_pet_ts_idx on public.weights (pet_id, ts desc);
drop index if exists public.weights_pet_id_idx;

-- VERIFY (as a client):
--   insert into activities (household_id, pet_id, member_id, type, ts)
--     values ('<own hh>', '<own pet>', '<someone else''s card>', 'fed', <now ms>)
--     returning member_id, user_id;   -- your own card + auth.uid()
--   insert ... pet_id = '<pet in another household>'   -- 42501
--   insert into pets (household_id, name, species) values ('<own hh>', 'Bun', 'rabbit');  -- ok
