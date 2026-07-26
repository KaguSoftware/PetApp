-- 0032: Turn on Supabase Realtime for the household's shared data.
--
-- Until now nothing in the app opened a realtime socket: a co-parent's log only
-- showed up after a pull-to-refresh. This adds the two server-side prerequisites
-- (publication membership + replica identity); the client subscriptions live in
-- lib/store.tsx.
--
-- WEB-DEMO COMPAT: no columns, no policies, no renames, no drops. Publication
-- membership and replica identity are invisible to PostgREST, so the web demo is
-- unaffected — its writes simply also emit realtime events. Fully reversible
-- with `alter publication supabase_realtime drop table <t>`.
--
-- WHY `replica identity full` AND NOT THE DEFAULT: under the default identity
-- (primary key), a DELETE's old_record carries ONLY the PK. That breaks realtime
-- two ways at once — you can't tell which household the deleted row belonged to,
-- and, fatally, a binding filtered on `household_id=eq.<id>` cannot MATCH a
-- delete at all, so the event is dropped server-side. Undoing a log, deleting a
-- reminder, or removing a pet would silently never propagate. `full` logs the
-- pre-image on UPDATE/DELETE (INSERT is unaffected either way); these tables are
-- small and insert-dominant, and no other logical subscriber exists here.
--
-- RLS still applies: Realtime evaluates each subscriber's SELECT policy per
-- event, so a client only ever receives rows it could already have read.

do $$
declare
  -- household-scoped first, then the pet-scoped tables (no household_id column —
  -- the client filters those with pet_id=in.(…)).
  tables constant text[] := array[
    'households', 'activities', 'reminders', 'members', 'pets',
    'care_schedules', 'shortcuts', 'household_members', 'booked_vets',
    'supplies', 'weights', 'meds', 'vaccinations', 'vet_visits'
  ];
  t text;
begin
  -- Realtime may never have been enabled on this project, in which case the
  -- publication doesn't exist yet. Creating it empty is exactly what the
  -- Dashboard's Replication toggle does.
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach t in array tables loop
    -- vaccinations / vet_visits arrived in 0013 and are absent on older
    -- databases — the client already tolerates that (LEGACY_HOUSEHOLD_SELECT),
    -- so this migration must too rather than hard-failing.
    if to_regclass('public.' || t) is null then
      raise notice '0032: skipping %, table not present', t;
      continue;
    end if;

    -- `alter publication ... add table` has no IF NOT EXISTS and raises 42710
    -- on a second run, so the guard is the idempotency.
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;

    -- Naturally idempotent, but skip the (brief) ACCESS EXCLUSIVE lock when
    -- it's already set. 'f' = full.
    if (select relreplident from pg_class where oid = to_regclass('public.' || t)) <> 'f' then
      execute format('alter table public.%I replica identity full', t);
    end if;
  end loop;
end;
$$;

-- Verify after applying:
--   select tablename from pg_publication_tables
--     where pubname = 'supabase_realtime' and schemaname = 'public' order by 1;
--   select relname, relreplident from pg_class
--     where relname = any (array['activities','households','supplies','reminders']);
--     -- expect relreplident = 'f' for each
