-- 0039: move a pet, and its whole history, to another household.
--
-- Two-sided handshake, deliberately: the SOURCE household's owner/admin files a
-- request naming a destination household id (the "Family ID" already shown in
-- Settings → Family), and the DESTINATION household's owner/admin accepts.
-- Nothing moves until acceptance, and the initiator never needs to be a member
-- of the destination — which is the whole point, since rehoming a pet usually
-- crosses families. Shaped after 0037's household_join_requests: a pending row
-- plus a request / approve / reject / list quartet of SECURITY DEFINER RPCs,
-- with no client-writable policies at all.
--
-- Depends on 0026 (has_household_role).

create table if not exists pet_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets (id) on delete cascade,
  from_household_id uuid not null references households (id) on delete cascade,
  to_household_id uuid not null references households (id) on delete cascade,
  requested_by uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  decided_at timestamptz,
  decided_by uuid references auth.users (id),
  constraint pet_transfer_distinct_households check (from_household_id <> to_household_id)
);

create index if not exists pet_transfer_requests_to_idx
  on pet_transfer_requests (to_household_id) where status = 'pending';
create index if not exists pet_transfer_requests_from_idx
  on pet_transfer_requests (from_household_id) where status = 'pending';

-- One outstanding offer PER PET, not per pet+destination: an owner must not be
-- able to shop the same pet to three households and have two of them accept.
create unique index if not exists pet_transfer_requests_pending_uniq
  on pet_transfer_requests (pet_id) where status = 'pending';

alter table pet_transfer_requests enable row level security;

-- Read-only for clients; every write goes through the functions below. The
-- destination's admins must be able to see the row even though they are not
-- members of the source household — that's what they're being asked to accept.
drop policy if exists "see own or either side" on pet_transfer_requests;
create policy "see own or either side" on pet_transfer_requests
  for select using (
    requested_by = auth.uid()
    or public.has_household_role(from_household_id, array['owner', 'admin'])
    or public.has_household_role(to_household_id, array['owner', 'admin'])
  );


-- ---------------------------------------------------------------- request ---

create or replace function public.request_pet_transfer(pet uuid, dest_household uuid)
returns pet_transfer_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  src uuid;
  req pet_transfer_requests;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select household_id into src from pets where id = pet;
  if src is null then
    raise exception 'pet not found' using errcode = 'P0002';
  end if;

  if not public.has_household_role(src, array['owner', 'admin']) then
    raise exception 'only the owner or an admin can move a pet' using errcode = '42501';
  end if;

  if dest_household = src then
    raise exception 'that pet is already in this household' using errcode = '22023';
  end if;

  -- Existence only. Nothing else about the destination is read or returned, so
  -- a wrong Family ID leaks nothing beyond "no such household".
  if not exists (select 1 from households where id = dest_household) then
    raise exception 'household not found' using errcode = 'P0002';
  end if;

  begin
    insert into pet_transfer_requests (pet_id, from_household_id, to_household_id, requested_by)
    values (pet, src, dest_household, uid)
    returning * into req;
  exception when unique_violation then
    raise exception 'a transfer is already pending for this pet' using errcode = '23505';
  end;

  return req;
end;
$$;

revoke all on function public.request_pet_transfer(uuid, uuid) from public;
grant execute on function public.request_pet_transfer(uuid, uuid) to authenticated;


-- ----------------------------------------------------------------- accept ---

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

  return req.pet_id;
end;
$$;

revoke all on function public.accept_pet_transfer(uuid) from public;
grant execute on function public.accept_pet_transfer(uuid) to authenticated;


-- ------------------------------------------------------- reject / cancel ---

create or replace function public.reject_pet_transfer(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  req pet_transfer_requests;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into req from pet_transfer_requests where id = request_id;
  if req.id is null then
    raise exception 'request not found' using errcode = 'P0002';
  end if;

  if not public.has_household_role(req.to_household_id, array['owner', 'admin']) then
    raise exception 'only the owner or an admin can decline a pet transfer' using errcode = '42501';
  end if;

  if req.status <> 'pending' then
    raise exception 'request already decided' using errcode = '22023';
  end if;

  update pet_transfer_requests
  set status = 'rejected', decided_at = now(), decided_by = uid
  where id = request_id;
end;
$$;

revoke all on function public.reject_pet_transfer(uuid) from public;
grant execute on function public.reject_pet_transfer(uuid) to authenticated;

-- Open to whoever currently runs the source household, not just the person who
-- filed it: the offer was a household-level act, so a new owner must be able to
-- withdraw one they inherited.
create or replace function public.cancel_pet_transfer(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  req pet_transfer_requests;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into req from pet_transfer_requests where id = request_id;
  if req.id is null then
    raise exception 'request not found' using errcode = 'P0002';
  end if;

  if req.requested_by <> uid
     and not public.has_household_role(req.from_household_id, array['owner', 'admin']) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if req.status <> 'pending' then
    raise exception 'request already decided' using errcode = '22023';
  end if;

  update pet_transfer_requests
  set status = 'cancelled', decided_at = now(), decided_by = uid
  where id = request_id;
end;
$$;

revoke all on function public.cancel_pet_transfer(uuid) from public;
grant execute on function public.cancel_pet_transfer(uuid) to authenticated;


-- ------------------------------------------------------------------- list ---

-- SECURITY DEFINER for the same reason list_join_requests is: the destination's
-- admins are not members of the source household, so pets/households RLS would
-- otherwise hide the pet's name and the sending household's name from exactly
-- the people being asked to make the decision. Returns both directions so one
-- fetch feeds both lists in the UI.
create or replace function public.list_pet_transfers(hid uuid)
returns table (
  id uuid,
  direction text,
  pet_id uuid,
  pet_name text,
  from_household_id uuid,
  from_household_name text,
  to_household_id uuid,
  to_household_name text,
  created_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not public.has_household_role(hid, array['owner', 'admin']) then
    raise exception 'only the owner or an admin can see pet transfers' using errcode = '42501';
  end if;

  return query
  select
    r.id,
    case when r.to_household_id = hid then 'incoming' else 'outgoing' end as direction,
    r.pet_id,
    p.name,
    r.from_household_id,
    fh.name,
    r.to_household_id,
    th.name,
    r.created_at,
    r.expires_at
  from pet_transfer_requests r
  join pets p on p.id = r.pet_id
  join households fh on fh.id = r.from_household_id
  join households th on th.id = r.to_household_id
  where r.status = 'pending'
    and r.expires_at > now()
    and (r.to_household_id = hid or r.from_household_id = hid)
  order by r.created_at desc;
end;
$$;

revoke all on function public.list_pet_transfers(uuid) from public;
grant execute on function public.list_pet_transfers(uuid) to authenticated;


-- Realtime: the source household never sees the pets UPDATE (the new
-- household_id no longer matches its binding filter), so the transfer row is
-- what both sides listen to in order to know to re-hydrate. See 0032/0036.
alter table pet_transfer_requests replica identity full;

do $$
begin
  alter publication supabase_realtime add table pet_transfer_requests;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
