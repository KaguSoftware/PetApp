-- 0055: free-form notes and symptoms for a pet.
--
-- A separate table rather than a new activities.type: notes have a body and a
-- kind, never grams/duration/med, and they shouldn't count toward the streak.
-- Attribution is server-owned exactly like activities (0054).

create table if not exists public.pet_notes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  pet_id uuid not null references public.pets (id) on delete cascade,
  member_id uuid references public.members (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  ts bigint not null,
  kind text not null default 'note' check (kind in ('note', 'symptom')),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists pet_notes_household_ts_idx on public.pet_notes (household_id, ts desc);
create index if not exists pet_notes_pet_ts_idx on public.pet_notes (pet_id, ts desc);
create index if not exists pet_notes_member_id_idx on public.pet_notes (member_id);
create index if not exists pet_notes_user_id_idx on public.pet_notes (user_id);

alter table public.pet_notes enable row level security;

drop policy if exists "household members read notes" on public.pet_notes;
create policy "household members read notes" on public.pet_notes
  for select to authenticated using (public.is_household_member(household_id));

drop policy if exists "household members add notes" on public.pet_notes;
create policy "household members add notes" on public.pet_notes
  for insert to authenticated with check (public.is_household_member(household_id));

drop policy if exists "household members edit notes" on public.pet_notes;
create policy "household members edit notes" on public.pet_notes
  for update to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

drop policy if exists "household members delete notes" on public.pet_notes;
create policy "household members delete notes" on public.pet_notes
  for delete to authenticated using (public.is_household_member(household_id));

-- Supabase's default privileges hand authenticated ALL on every new table, and
-- column grants are no-ops next to a table-level grant — so revoke first.
revoke all on public.pet_notes from anon, authenticated;
grant select, delete on public.pet_notes to authenticated;
grant insert (id, household_id, pet_id, member_id, user_id, ts, kind, body) on public.pet_notes to authenticated;
grant update (body, kind, ts) on public.pet_notes to authenticated;

-- Same stamping as activities: caller's own card + uid, pet in the household,
-- no future timestamps. INVOKER for the current_user check (AGENTS.md).
create or replace function public.stamp_pet_note()
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
  if tg_op = 'INSERT' then
    card := public.my_member_card(new.household_id);
    if card is null then
      raise exception 'you have no member card in this household' using errcode = '42501';
    end if;
    new.user_id := auth.uid();
    new.member_id := card;
    if not exists (select 1 from public.pets where id = new.pet_id and household_id = new.household_id) then
      raise exception 'pet does not belong to this household' using errcode = '42501';
    end if;
  elsif (new.household_id, new.pet_id, new.member_id, new.user_id)
        is distinct from (old.household_id, old.pet_id, old.member_id, old.user_id) then
    raise exception 'only the text, kind and time of a note can change' using errcode = '42501';
  end if;
  if new.ts > (extract(epoch from now()) * 1000)::bigint + 30 * 60 * 1000 then
    raise exception 'a note cannot be in the future' using errcode = '22023';
  end if;
  return new;
end;
$$;
drop trigger if exists pet_notes_stamp on public.pet_notes;
create trigger pet_notes_stamp
  before insert or update on public.pet_notes
  for each row execute function public.stamp_pet_note();

do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pet_notes') then
    alter publication supabase_realtime add table public.pet_notes;
  end if;
end;
$$;
