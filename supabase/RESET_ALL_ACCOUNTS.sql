-- ⚠️ DESTRUCTIVE — WIPES EVERY ACCOUNT AND HOUSEHOLD IN THIS SUPABASE PROJECT
--
-- This is a DEVELOPMENT reset, kept as a file (never run automatically) so it
-- can only ever happen by deliberate copy-paste into the SQL editor.
--
-- READ BEFORE RUNNING:
--   * The web demo shares this project. This deletes ITS accounts and data too.
--   * There is no undo. Supabase's PITR/backups are the only recovery path.
--   * Everything cascades from auth.users: households, members, pets, weights,
--     supplies, meds, activities, reminders, vaccinations, vet_visits,
--     care_schedules, shortcuts, forum posts/answers/votes, push_tokens,
--     household_members, household_invites, user_profiles.
--
-- Run it in: Supabase dashboard → SQL Editor → new query → paste → Run.

-- 1. Sanity check FIRST — see what you're about to destroy.
select
  (select count(*) from auth.users)         as accounts,
  (select count(*) from public.households)  as households,
  (select count(*) from public.pets)        as pets,
  (select count(*) from public.activities)  as activities;

-- 2. THE WIPE. Deleting the auth users cascades everything else.
--    (If migration 0028 is applied, its on_auth_user_deleted trigger runs
--    prepare_account_deletion per row — harmless here, just slower. To skip
--    it for a full wipe, uncomment the disable/enable lines around it.)

-- alter table auth.users disable trigger on_auth_user_deleted;
delete from auth.users;
-- alter table auth.users enable trigger on_auth_user_deleted;

-- 3. Sweep any household rows that somehow outlived their owner (there should
--    be none — owner_id is NOT NULL with ON DELETE CASCADE).
delete from public.households;

-- 4. Confirm everything is empty.
select
  (select count(*) from auth.users)                 as accounts,
  (select count(*) from public.households)          as households,
  (select count(*) from public.household_members)   as memberships,
  (select count(*) from public.members)             as member_cards,
  (select count(*) from public.pets)                as pets,
  (select count(*) from public.activities)          as activities,
  (select count(*) from public.user_profiles)       as profiles;

-- AFTER RUNNING: sign out on every device (the app holds a session for a user
-- that no longer exists — it'll fail its next token refresh and bounce you to
-- the welcome screen, but signing out explicitly is cleaner).
