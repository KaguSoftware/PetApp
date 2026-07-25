-- 0029: Conditional signup seeding — invitees and OAuth users start clean.
--
-- handle_new_user() has always created + seeded a full demo household (Mom/
-- Dad/Sara cards, two pets, activity history) for EVERY new auth user. That's
-- right for the web demo, but wrong for mobile: someone signing up to accept
-- an invite got a junk household they could never delete, and OAuth signups
-- can't even carry an opt-out flag.
--
-- New rule, evaluated at the top of the same trigger:
--   * provider <> 'email' (Apple / Google — only mobile offers those) → skip
--   * raw_user_meta_data.seed_demo = false (mobile email signups pass
--     options.data.seed_demo: false) → skip
--   * otherwise → seed exactly as 0011 did (body reproduced verbatim below)
--
-- Skipped users still get their user_profiles row; the mobile onboarding then
-- walks them through create-or-join.
--
-- WEB-DEMO COMPAT: web signups are email/password and don't send seed_demo →
-- both guards pass → identical seeding to 0011. No web change whatsoever.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  h_id uuid;
  m_you uuid;
  m_mom uuid;
  m_dad uuid;
  m_sara uuid;
  p_cat uuid;
  p_dog uuid;
  now_ms bigint := (extract(epoch from now()) * 1000)::bigint;
  hour_ms bigint := 3600000;
  day_ms bigint := 86400000;
  week_ms bigint := 7 * 86400000;
  provider text := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
begin
  if provider <> 'email'
     or coalesce(new.raw_user_meta_data ->> 'seed_demo', 'true') = 'false' then
    insert into user_profiles (user_id) values (new.id)
    on conflict (user_id) do nothing;
    return new;
  end if;

  insert into households (owner_id, name, coins, xp, streak, units)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', 'You') || '''s household', 340, 260, 4, 'kg')
  returning id into h_id;

  insert into members (household_id, name, emoji, role, gradient_from, gradient_to) values
    (h_id, coalesce(new.raw_user_meta_data ->> 'name', 'You'), '🧑‍💻', 'Owner', 'oklch(0.62 0.16 258)', 'oklch(0.5 0.18 280)')
    returning id into m_you;
  insert into members (household_id, name, emoji, role, gradient_from, gradient_to) values
    (h_id, 'Mom', '👩‍🦰', 'Admin', 'oklch(0.68 0.15 350)', 'oklch(0.56 0.17 20)')
    returning id into m_mom;
  insert into members (household_id, name, emoji, role, gradient_from, gradient_to) values
    (h_id, 'Dad', '👨‍🦳', 'Member', 'oklch(0.66 0.13 165)', 'oklch(0.54 0.13 200)')
    returning id into m_dad;
  insert into members (household_id, name, emoji, role, gradient_from, gradient_to) values
    (h_id, 'Sara', '👧', 'Member', 'oklch(0.72 0.14 85)', 'oklch(0.62 0.16 50)')
    returning id into m_sara;

  update households set current_member_id = m_you where id = h_id;

  update household_members set member_id = m_you where household_id = h_id and user_id = new.id;
  insert into user_profiles (user_id, active_household_id)
  values (new.id, h_id)
  on conflict (user_id) do update set active_household_id = excluded.active_household_id;

  insert into pets (id, household_id, name, species, breed, sex, emoji, age_years, weight_kg, owned, equipped, gradient_from, gradient_to)
  values (gen_random_uuid(), h_id, 'Mozart', 'cat', 'British Shorthair', 'male', '🐱', 10.0/12, 5.1,
          array['bowtie', 'glasses'], '{"neck":"bowtie"}'::jsonb, 'oklch(0.72 0.008 260)', 'oklch(0.5 0.01 260)')
  returning id into p_cat;

  insert into pets (id, household_id, name, species, breed, emoji, age_years, weight_kg, owned, equipped, gradient_from, gradient_to)
  values (gen_random_uuid(), h_id, 'Biscuit', 'dog', 'Golden Retriever', '🐶', 2, 29.5,
          array['cap'], '{"head":"cap"}'::jsonb, 'oklch(0.74 0.13 75)', 'oklch(0.6 0.15 45)')
  returning id into p_dog;

  insert into weights (pet_id, ts, kg) values
    (p_cat, now_ms - 24*week_ms, 2.8), (p_cat, now_ms - 20*week_ms, 3.4), (p_cat, now_ms - 16*week_ms, 3.9),
    (p_cat, now_ms - 12*week_ms, 4.3), (p_cat, now_ms - 8*week_ms, 4.6), (p_cat, now_ms - 4*week_ms, 4.9),
    (p_cat, now_ms, 5.1),
    (p_dog, now_ms - 24*week_ms, 24.0), (p_dog, now_ms - 20*week_ms, 25.8), (p_dog, now_ms - 16*week_ms, 27.0),
    (p_dog, now_ms - 12*week_ms, 28.1), (p_dog, now_ms - 8*week_ms, 28.9), (p_dog, now_ms - 4*week_ms, 29.2),
    (p_dog, now_ms, 29.5);

  insert into supplies (pet_id, supply_key, name, icon, level) values
    (p_cat, 'food', 'Dry food', 'bowl', 62),
    (p_cat, 'litter', 'Litter', 'broom', 18),
    (p_cat, 'treats', 'Dental treats', 'star', 80),
    (p_dog, 'food', 'Kibble', 'bowl', 45),
    (p_dog, 'poopbags', 'Poop bags', 'broom', 12),
    (p_dog, 'treats', 'Training treats', 'star', 70);

  insert into activities (household_id, pet_id, member_id, type, ts, note) values
    (h_id, p_cat, m_mom, 'fed', now_ms - 3*hour_ms, null),
    (h_id, p_dog, m_dad, 'walk', now_ms - 4*hour_ms, null),
    (h_id, p_cat, m_sara, 'water', now_ms - 6*hour_ms, null),
    (h_id, p_dog, m_you, 'fed', now_ms - 7*hour_ms, null),
    (h_id, p_cat, m_you, 'litter', now_ms - 26*hour_ms, null),
    (h_id, p_dog, m_mom, 'groomed', now_ms - 30*hour_ms, null),
    (h_id, p_cat, m_dad, 'fed', now_ms - 28*hour_ms, null),
    (h_id, p_dog, m_sara, 'walk', now_ms - 32*hour_ms, null),
    (h_id, p_cat, m_mom, 'meds', now_ms - 2*day_ms - 5*hour_ms, null),
    (h_id, p_cat, m_you, 'vet', now_ms - 12*day_ms, 'Regular checkup — all healthy!');

  insert into reminders (household_id, pet_id, title, emoji, due, done, source) values
    (h_id, p_cat, 'Flea treatment', '💊', now_ms + 1*day_ms, false, 'manual'),
    (h_id, p_dog, 'Buy more kibble', '🛒', now_ms + 2*day_ms, false, 'manual'),
    (h_id, p_cat, 'Full litter change', '🧹', now_ms + 3*day_ms, false, 'manual'),
    (h_id, p_dog, 'Bath day', '🛁', now_ms + 5*day_ms, false, 'manual');

  return new;
end;
$$;
