-- READ-ONLY schema snapshot. Paste into Supabase Dashboard > SQL Editor > Run.
-- Returns ONE row / ONE column (`snapshot`, jsonb). Copy the cell and save it to
-- supabase/diagnostics/schema_snapshot.json in this repo.
-- Contains no row data — only table/column definitions, policies, grants,
-- function signatures/bodies, triggers, indexes and the realtime publication.

with
cols as (
  select table_name, jsonb_agg(jsonb_build_object(
           'col', column_name, 'type', data_type, 'null', is_nullable, 'default', column_default)
           order by ordinal_position) as columns
  from information_schema.columns
  where table_schema = 'public'
  group by table_name
),
tbls as (
  select c.relname as table_name, c.relrowsecurity as rls, c.relreplident as replica_identity
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
),
pols as (
  select tablename, jsonb_agg(jsonb_build_object(
           'name', policyname, 'cmd', cmd, 'roles', roles, 'using', qual, 'check', with_check)) as policies
  from pg_policies where schemaname = 'public' group by tablename
),
tgrants as (
  select table_name, jsonb_agg(distinct grantee || ':' || privilege_type) as grants
  from information_schema.role_table_grants
  where table_schema = 'public' and grantee in ('anon', 'authenticated')
  group by table_name
),
cgrants as (
  select table_name, jsonb_agg(grantee || ':' || privilege_type || ':' || column_name order by column_name) as column_grants
  from information_schema.column_privileges
  where table_schema = 'public' and grantee in ('anon', 'authenticated')
    and privilege_type in ('UPDATE', 'INSERT')
  group by table_name
),
cons as (
  select conrelid::regclass::text as table_name,
         jsonb_agg(jsonb_build_object('name', conname, 'def', pg_get_constraintdef(oid))) as constraints
  from pg_constraint
  where connamespace = 'public'::regnamespace
  group by conrelid
),
idx as (
  select tablename, jsonb_agg(indexdef) as indexes
  from pg_indexes where schemaname = 'public' group by tablename
),
trg as (
  select c.relname as table_name, jsonb_agg(jsonb_build_object(
           'name', t.tgname, 'def', pg_get_triggerdef(t.oid))) as triggers
  from pg_trigger t join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and not t.tgisinternal
  group by c.relname
),
funcs as (
  select jsonb_agg(jsonb_build_object(
           'sig', p.oid::regprocedure::text,
           'definer', p.prosecdef,
           'config', p.proconfig,
           'acl', p.proacl::text,
           'body', p.prosrc) order by p.proname) as functions
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
),
pub as (
  select jsonb_agg(schemaname || '.' || tablename) as realtime
  from pg_publication_tables where pubname = 'supabase_realtime'
),
priv as (
  select jsonb_agg(c.relname) as private_tables
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'private' and c.relkind = 'r'
)
select jsonb_build_object(
  'generated_at', now(),
  'pg_version', version(),
  'tables', (
    select jsonb_object_agg(t.table_name, jsonb_build_object(
      'rls', t.rls,
      'replica_identity', t.replica_identity,
      'columns', cols.columns,
      'policies', coalesce(pols.policies, '[]'),
      'grants', coalesce(tgrants.grants, '[]'),
      'column_grants', coalesce(cgrants.column_grants, '[]'),
      'constraints', coalesce(cons.constraints, '[]'),
      'indexes', coalesce(idx.indexes, '[]'),
      'triggers', coalesce(trg.triggers, '[]')))
    from tbls t
    left join cols on cols.table_name = t.table_name
    left join pols on pols.tablename = t.table_name
    left join tgrants on tgrants.table_name = t.table_name
    left join cgrants on cgrants.table_name = t.table_name
    left join cons on cons.table_name = t.table_name
    left join idx on idx.tablename = t.table_name
    left join trg on trg.table_name = t.table_name
  ),
  'functions', (select functions from funcs),
  'realtime', (select realtime from pub),
  'private_tables', (select private_tables from priv),
  'advisory_lock_bigint_bigint_exists', exists (
    select 1 from pg_proc where proname = 'pg_advisory_xact_lock'
      and pg_get_function_identity_arguments(oid) = 'bigint, bigint')
) as snapshot;
