-- 0050: stop handing the family password hash to the client.
--
-- 0047 closed the write path; the hash stayed SELECT-able by every household
-- member, which is an offline brute-force target — unsalted single-round
-- SHA-256 of a short, human-chosen password is a rainbow-table lookup, not an
-- attack. This closes the read path, and that is what makes 0048's attempt
-- limiter mean anything: with the hash unreadable, guessing has to go through
-- verify_family_password, which is rate-limited.
--
-- DO NOT APPLY until both clients ship the change from 0049's header:
--   * this repo — lib/store.tsx now names household columns explicitly
--   * the WEB DEMO — shares this database, reads the hash at lib/store.tsx:2069
--     and :2098, and writes it at :2078 (that write is already broken by 0047)
-- Applying early turns every household hydration into 42501 in whichever client
-- is still asking for `*`.
--
-- WHY THIS IS FOUR MIGRATIONS INSTEAD OF ONE. `households` lost its table-wide
-- UPDATE grant in 0042 but keeps a table-wide SELECT grant, and the app
-- hydrates with `select *`. Revoking one column therefore means re-granting the
-- other fourteen by name — and writing that list from memory is exactly how
-- 0042 broke coin sync. The grant below is generated from the system catalogue
-- at apply time rather than typed out, so it is whatever the table actually
-- has, and a column added later cannot be silently dropped from it.

do $$
declare
  cols text;
begin
  if to_regclass('public.households') is null then
    raise exception 'households not found — refusing to revoke SELECT blindly';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'households'
      and column_name = 'family_password_set'
  ) then
    raise exception 'apply 0049 first — family_password_set is what the clients read';
  end if;

  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into cols
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'households'
    and column_name <> 'family_password_hash';

  execute 'revoke select on public.households from authenticated';
  execute format('grant select (%s) on public.households to authenticated', cols);
end;
$$;

-- `anon` is left exactly as it was: no policy on households admits an
-- unauthenticated caller, so its grants are unreachable either way, and
-- changing them here would be an unrelated edit hiding inside a security fix.

-- Verification (expected: every column EXCEPT family_password_hash)
--   select column_name from information_schema.column_privileges
--   where table_schema = 'public' and table_name = 'households'
--     and grantee = 'authenticated' and privilege_type = 'SELECT'
--   order by column_name;
