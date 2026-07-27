-- 0036: Turn on Supabase Realtime for chat_messages, same rationale as
-- 0032_realtime.sql for the household tables — without this, a message sent
-- by someone else only shows up after a manual refresh.
--
-- `replica identity full` isn't strictly required (chat has no client-side
-- delete/update path today), but it's set anyway to match 0032's precedent
-- and keep any future delete/edit feature realtime-correct for free.

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;

  if (select relreplident from pg_class where oid = to_regclass('public.chat_messages')) <> 'f' then
    alter table public.chat_messages replica identity full;
  end if;
end;
$$;
