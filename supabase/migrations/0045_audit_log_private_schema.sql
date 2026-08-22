-- 0045: move audit_log out of `public` and into a `private` schema.
--
-- 0044 already made the table unreachable from a client: RLS on, zero policies,
-- grants revoked from anon/authenticated. This closes the surface one level
-- earlier instead. PostgREST only serves the schemas it is configured to expose
-- (`public` and `graphql_public` on a stock Supabase project), so a table in
-- `private` has no REST route at all — there is nothing for a policy mistake,
-- an accidental `grant`, or a future `create policy` to re-open.
--
-- Cheap here precisely because 0044 funnelled every write through ONE function:
-- public.write_audit_log is the only thing that names the table, so this is a
-- schema move plus a one-line change to that function.
--
-- CONSEQUENCE, on purpose: an edge function holding the service key can no
-- longer read the log over PostgREST either — `private` is not exposed to
-- anyone. Reads happen in the SQL editor (as postgres) or over a direct
-- Postgres connection. That is the intended posture for an audit trail: it is
-- an operator artifact, not an application resource.
--
-- Depends on 0044.

create schema if not exists private;

-- The schema itself is the first gate: without USAGE, a role cannot even name
-- an object inside it, whatever the table grants say.
revoke all on schema private from public;
revoke usage on schema private from anon, authenticated;
grant usage on schema private to service_role;

-- Indexes, constraints, the identity sequence and the existing grants all
-- travel with the table.
alter table if exists public.audit_log set schema private;

-- Restated so this migration is self-contained and survives a replay onto a
-- database where the table was created some other way.
alter table private.audit_log enable row level security;
revoke all on table private.audit_log from anon, authenticated;
grant select on table private.audit_log to service_role;

-- write_audit_log pins `search_path = public`, so the table MUST be named in
-- full here. This is the single line that changes; the body is otherwise
-- identical to 0044's.
create or replace function public.write_audit_log(
  p_action      text,
  p_household   uuid default null,
  p_target_user uuid default null,
  p_target_id   uuid default null,
  p_metadata    jsonb default '{}'::jsonb,
  p_actor       uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into private.audit_log (action, actor_user_id, household_id, target_user_id, target_id, metadata)
  values (p_action, coalesce(p_actor, auth.uid()), p_household, p_target_user, p_target_id,
          coalesce(p_metadata, '{}'::jsonb));
end;
$$;
revoke all on function public.write_audit_log(text, uuid, uuid, uuid, jsonb, uuid)
  from public, anon, authenticated;

-- The eleven RPCs from 0044 are untouched: they call write_audit_log, never the
-- table, which is the whole reason this migration is nine lines of real work.
