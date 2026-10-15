-- 0057: retire the backend surface of features the rebuilt app no longer has.
--
-- Forum, chat, reminders/alerts, care schedules, shortcuts, supplies, the vet
-- marketplace, pet transfers, join-request approval and push tokens are gone
-- from the app (owner decision, 2026-10-15), but their tables were still fully
-- reachable from any signed-in client: forum/chat rows exposed household and
-- user ids to everyone, forum score was client-insertable, and reminders /
-- care_schedules / shortcuts accepted a pet_id from another household.
--
-- This migration is NON-DESTRUCTIVE: no table or row is dropped. Clients lose
-- every privilege on these tables, they leave the realtime publication, and the
-- RPCs that only served them are dropped (their source stays in older
-- migrations). Dropping the tables themselves — which deletes their data — is
-- a separate, explicitly confirmed migration.

do $$
declare
  t text;
  retired text[] := array[
    'forum_posts', 'forum_answers', 'forum_votes',
    'chat_rooms', 'chat_messages', 'chat_blocks', 'chat_reports',
    'reminders', 'care_schedules', 'shortcuts', 'supplies', 'booked_vets',
    'pet_transfer_requests', 'household_join_requests', 'push_tokens', 'coin_grants'
  ];
begin
  foreach t in array retired loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    execute format('revoke all on public.%I from anon, authenticated', t);
    if exists (select 1 from pg_publication_tables
               where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime drop table public.%I', t);
    end if;
  end loop;
end;
$$;

drop function if exists public.approve_join_request(uuid);
drop function if exists public.reject_join_request(uuid);
drop function if exists public.list_join_requests(uuid);
drop function if exists public.request_pet_transfer(uuid, uuid);
drop function if exists public.accept_pet_transfer(uuid);
drop function if exists public.reject_pet_transfer(uuid);
drop function if exists public.cancel_pet_transfer(uuid);
drop function if exists public.list_pet_transfers(uuid);

-- TRUNCATE ignores RLS. PostgREST doesn't expose it, but no client role needs
-- it on any table, so it goes everywhere.
do $$
declare
  t record;
begin
  for t in
    select c.relname from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
  loop
    execute format('revoke truncate, references, trigger on public.%I from anon, authenticated', t.relname);
  end loop;
end;
$$;

-- VERIFY:
--   select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1;
--     -- activities, household_members, households, meds, members, pet_notes, pets,
--     -- vaccinations, vet_visits, weights
--   select count(*) from information_schema.role_table_grants
--    where table_schema = 'public' and grantee in ('anon', 'authenticated')
--      and table_name in ('forum_posts', 'chat_messages', 'reminders');   -- 0
