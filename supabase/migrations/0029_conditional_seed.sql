-- 0029: NO demo seeding on signup — every new account starts empty.
--
-- handle_new_user() has always created + seeded a full demo household for
-- EVERY new auth user: Mom/Dad/Sara member cards, Mozart the cat, Biscuit the
-- dog, seven weight points each, six supplies, ten activities, four reminders,
-- and 340 coins / 260 xp / a 4-day streak. That made a new account look
-- populated, at the cost of every real user having to delete fake pets and
-- family members before they could use the app — and an invitee got a junk
-- household they could never get rid of.
--
-- Owner decision (2026-07-26): remove all of it, for every client. A new
-- account now gets ONLY its user_profiles row; the mobile app's onboarding
-- (create-or-join → name it → first pet → invite family) builds the real
-- household, and joining by invite never creates a stray one.
--
-- WEB-DEMO COMPAT: this is a deliberate, owner-approved behavior change for
-- the web demo too — its signups also stop being seeded. Its own
-- bootstrapHousehold() fallback still creates a household on demand if that
-- client needs one (see the follow-up notes in HANDOFF.md), so it does not
-- break; new web accounts simply start empty like mobile ones.
--
-- Reversible: to restore seeding, re-apply the body from the web demo's
-- 0011_multi_user_households.sql §6.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The profile row is the only thing every account needs; active_household_id
  -- stays null until the user creates or joins a household.
  insert into user_profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;
