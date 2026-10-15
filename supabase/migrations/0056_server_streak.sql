-- 0056: the streak is computed by the server, in the household's timezone.
--
-- Before: every client computed the streak itself with 24h arithmetic (broke
-- across DST), wrote the absolute value to households.streak (last writer wins
-- across family members in different zones), and accepted any back-dated ts
-- (back-filling 30 past days built a 30-day streak). 0051 revoked the client's
-- write; this is the replacement.
--
-- Rules:
--   * a "day" is a calendar day in households.timezone (default UTC)
--   * a day counts if any care log on it was recorded within 7 days of the
--     time it describes — honest late logging still counts, back-filling a
--     month does not (activities.created_at, new, is when it was recorded)
--   * the streak is the run of consecutive counted days ending today, or
--     ending yesterday if nothing has been logged yet today
--   * streak_day is the last day of the run, so a client can show 0 once it is
--     older than yesterday without waiting for the next write

-- 1. When was a log recorded? ---------------------------------------------------

alter table public.activities add column if not exists created_at timestamptz;
update public.activities set created_at = to_timestamp(ts / 1000.0) where created_at is null;
alter table public.activities alter column created_at set default now();
alter table public.activities alter column created_at set not null;

-- Clients may not choose their own recorded-at time. A column REVOKE is a no-op
-- while a table-level grant exists, so the table grants are replaced by column
-- lists. user_id / member_id stay insertable but are overwritten by 0054's
-- stamp trigger; only the descriptive fields of a log are updatable.
revoke insert, update on public.activities from authenticated, anon;
grant insert (id, household_id, pet_id, member_id, user_id, type, ts, note, grams, med_id, duration_minutes)
  on public.activities to authenticated;
grant update (ts, note, grams, duration_minutes) on public.activities to authenticated;

alter table public.households add column if not exists streak_day date;
grant select (streak_day) on public.households to authenticated;

-- 2. The computation ------------------------------------------------------------

create or replace function public.recompute_streak(hid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tz text;
  today date;
  d date;
  run integer := 0;
  last_day date;
begin
  -- Lock the row first: two family members logging at once would otherwise each
  -- compute from a snapshot missing the other's row, and the last write wins.
  -- After the lock wait, READ COMMITTED gives the scan below a fresh snapshot.
  select coalesce(timezone, 'UTC') into tz from households where id = hid for update;
  if not found then
    return;
  end if;
  -- An unknown zone name must never make a log write fail.
  begin
    today := (now() at time zone tz)::date;
  exception when others then
    tz := 'UTC';
    today := (now() at time zone 'UTC')::date;
  end;

  for d in
    select distinct (to_timestamp(a.ts / 1000.0) at time zone tz)::date as day
    from activities a
    where a.household_id = hid
      and a.ts >= (extract(epoch from (now() - interval '400 days')) * 1000)::bigint
      and a.created_at <= to_timestamp(a.ts / 1000.0) + interval '7 days'
      -- clock skew can put a log a few minutes into tomorrow; it counts for no day yet
      and (to_timestamp(a.ts / 1000.0) at time zone tz)::date <= today
    order by day desc
  loop
    if run = 0 then
      exit when d < today - 1;  -- the run must end today or yesterday
      run := 1;
      last_day := d;
    elsif d = last_day - run then
      run := run + 1;
    else
      exit;
    end if;
  end loop;

  update households
    set streak = run,
        streak_day = case when run = 0 then null else last_day end
    where id = hid
      and (streak is distinct from run
           or streak_day is distinct from (case when run = 0 then null else last_day end));
end;
$$;
revoke all on function public.recompute_streak(uuid) from public, anon, authenticated;

-- 3. Triggers -------------------------------------------------------------------
-- Statement-level with transition tables, so "log for all pets" recomputes once
-- per household. Postgres allows only one event per trigger when transition
-- tables are used, hence three small functions.

create or replace function public.activities_streak_from_new()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
begin
  for hid in select distinct household_id from new_rows loop
    perform public.recompute_streak(hid);
  end loop;
  return null;
end;
$$;

create or replace function public.activities_streak_from_old()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
begin
  for hid in select distinct household_id from old_rows loop
    perform public.recompute_streak(hid);
  end loop;
  return null;
end;
$$;

drop trigger if exists activities_streak_ins on public.activities;
create trigger activities_streak_ins
  after insert on public.activities
  referencing new table as new_rows
  for each statement execute function public.activities_streak_from_new();

drop trigger if exists activities_streak_upd on public.activities;
create trigger activities_streak_upd
  after update on public.activities
  referencing new table as new_rows
  for each statement execute function public.activities_streak_from_new();

drop trigger if exists activities_streak_del on public.activities;
create trigger activities_streak_del
  after delete on public.activities
  referencing old table as old_rows
  for each statement execute function public.activities_streak_from_old();

-- Changing the timezone re-buckets the days.
create or replace function public.households_streak_on_tz()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_streak(new.id);
  return null;
end;
$$;

drop trigger if exists households_streak_tz on public.households;
create trigger households_streak_tz
  after update of timezone on public.households
  for each row
  when (old.timezone is distinct from new.timezone)
  execute function public.households_streak_on_tz();

-- 4. Backfill -------------------------------------------------------------------

do $$
declare
  hid uuid;
begin
  for hid in select id from public.households loop
    perform public.recompute_streak(hid);
  end loop;
end;
$$;

-- VERIFY:
--   log today → households.streak >= 1, streak_day = today (household tz)
--   insert a log with ts 30 days ago → streak unchanged (created_at is now)
