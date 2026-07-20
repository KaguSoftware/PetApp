-- Home-screen one-tap logging shortcuts. Each shortcut pins a (pet, care action
-- [, medication][, portion]) to the Home grid so a repeated log is a single tap.
-- Shared across the household, like reminders and care_schedules.
--
-- Additive to the web-demo schema (migrations 0001–0017): a brand-new table the
-- web client never queries. No renames, no drops, no retightening.

create extension if not exists pgcrypto;

create table if not exists shortcuts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  -- The pets this one tap logs for: a single pet, or the whole household
  -- ("Fed all"). An array (not an FK column) so one tile can bulk-log. Rows for
  -- a deleted pet are pruned by the client; the household_id FK still cascades.
  pet_ids uuid[] not null default '{}',
  action_type text not null check (action_type in ('fed','water','litter','walk','groomed','meds','vet')),
  -- Set only when action_type = 'meds': the specific medication this shortcut logs.
  med_id uuid references meds (id) on delete cascade,
  -- The IconName glyph chosen for the tile (free-text; the client maps it to an icon).
  icon text not null,
  -- Optional custom label; null → the client derives one from the action/med.
  label text,
  -- Portion for a "fed" shortcut, as a fraction of one cup (0.25–1). Grams are
  -- derived per-pet at log time (cupGrams differs per pet). Null on a single-pet
  -- "fed" shortcut means "ask each time" (open the portion picker on tap).
  portion_frac numeric,
  -- Ascending display order on the Home grid.
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create index shortcuts_household_idx on shortcuts (household_id);

alter table shortcuts enable row level security;

-- Household members manage their own household's shortcuts — same
-- household_members membership predicate the rest of the app's RLS keys off of.
create policy "shortcuts household members" on shortcuts
  for all
  using (
    exists (
      select 1 from household_members hm
      where hm.household_id = shortcuts.household_id
        and hm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from household_members hm
      where hm.household_id = shortcuts.household_id
        and hm.user_id = auth.uid()
    )
  );
