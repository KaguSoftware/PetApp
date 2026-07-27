-- Appearance gains a "System" option (Settings > Accessibility >
-- Appearance) that follows the phone's own light/dark setting instead of
-- pinning a palette. 0025's CHECK only allowed ('light', 'dark'), so upserting
-- the new value failed with 23514 and appearance silently stopped syncing —
-- widen it to accept 'system'.
--
-- The stored value is the PREFERENCE, not the resolved palette: 'system' means
-- "ask the device", which is why it can't be normalised to light/dark here —
-- the same account resolves it differently on a phone set to dark and a tablet
-- set to light.

-- Drop by discovery rather than by name: Postgres auto-names an inline column
-- CHECK `user_profiles_theme_mode_check`, but 0025 used `add column if not
-- exists`, so on any database where the column already existed the constraint
-- may carry a different name (or not exist at all). Dropping every CHECK on
-- the table that references theme_mode covers all of those cases.
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'user_profiles'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%theme_mode%'
  loop
    execute format('alter table public.user_profiles drop constraint %I', c.conname);
  end loop;
end $$;

alter table user_profiles add constraint user_profiles_theme_mode_check check (theme_mode in ('light', 'dark', 'system'));

-- New accounts follow the device by default, matching the app's own default.
alter table user_profiles alter column theme_mode set default 'system';
