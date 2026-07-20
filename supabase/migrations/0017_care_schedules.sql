-- Care schedules — named time slots per pet per care action (feeding times,
-- per-medication dose times, grooming cadence, …). Drives the Logs dashboard's
-- done/due/overdue state and per-device local notifications.
--
-- Additive to the web-demo schema (migrations 0001–0016): a brand-new table the
-- web client never queries, plus one nullable column on activities. No renames,
-- no drops, no retightening.

create extension if not exists pgcrypto;

create table if not exists care_schedules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  pet_id uuid not null references pets (id) on delete cascade,
  action_type text not null check (action_type in ('fed','water','litter','walk','groomed','meds','vet')),
  -- Set only when action_type = 'meds': the specific medication this schedule tracks.
  med_id uuid references meds (id) on delete cascade,
  -- Ordered time slots: [{ "time": "07:30", "label": "Breakfast", "grams": 60 }, ...]
  -- "time" is 24h "HH:MM" local time; label and grams are optional per slot.
  slots jsonb not null default '[]',
  -- Days-of-week bitmask, bit i = JS Date.getDay() i (bit 0 = Sunday). 127 = every day.
  days_mask int not null default 127 check (days_mask between 1 and 127),
  -- Alternative cadence for infrequent actions (groom/vet): every N days from
  -- anchor_ts (ms epoch). When set, days_mask is ignored.
  interval_days int check (interval_days >= 1),
  anchor_ts bigint,
  -- "Show as done until this many minutes before the next slot, then flip back to due."
  grace_minutes int not null default 30 check (grace_minutes between 0 and 720),
  created_at timestamptz not null default now()
);

-- One series per (pet, action) and one per (pet, med); med_id is null for
-- non-med schedules, so both need partial unique indexes.
create unique index care_schedules_pet_action_uq on care_schedules (pet_id, action_type) where med_id is null;
create unique index care_schedules_pet_med_uq on care_schedules (pet_id, med_id) where med_id is not null;
create index care_schedules_household_idx on care_schedules (household_id);

alter table care_schedules enable row level security;

-- Household members manage their own household's schedules — same
-- household_members membership predicate the rest of the app's RLS keys off of.
create policy "care_schedules household members" on care_schedules
  for all
  using (
    exists (
      select 1 from household_members hm
      where hm.household_id = care_schedules.household_id
        and hm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from household_members hm
      where hm.household_id = care_schedules.household_id
        and hm.user_id = auth.uid()
    )
  );

-- Which medication a "meds" activity was for (nullable — legacy rows and
-- non-med logs stay null; the web demo's select * tolerates it harmlessly).
alter table activities add column if not exists med_id uuid references meds (id) on delete set null;
