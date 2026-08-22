-- 0047: make the family password verifiable on the server.
--
-- THE HOLE (threat-model.md scenario A4). The family password gate ran entirely
-- in the client:
--   * `verifyFamilyPassword` SELECTed households.family_password_hash and
--     compared it in JavaScript;
--   * `setFamilyPassword` did the same for the current password, then wrote the
--     new hash with a plain `update`;
--   * 0043 granted UPDATE (family_password_hash) to `authenticated`.
-- So any household member could skip the check with a single REST call and
-- overwrite the household's family password — no knowledge of the old one
-- required. The check was a suggestion, not a control.
--
-- WHAT THIS FIXES. Both operations move behind SECURITY DEFINER RPCs that
-- compare the old password server-side, and the client's direct UPDATE right on
-- the column is revoked. After this, changing the password requires proving the
-- current one, and that proof happens somewhere the caller cannot edit.
--
-- WHAT THIS DOES NOT FIX, and must not be claimed to.
--   1. The hash is still SELECT-able. `households` still carries a table-wide
--      SELECT grant, and the app's hydration query is `select *`, so revoking
--      the column means enumerating every other column in both the grant and the
--      client. Doing that from memory is exactly how 0042 broke coin sync.
--      Deferred to 0048, which must be written against a real
--      `information_schema.columns` listing, not a guess.
--   2. The hash is unsalted single-round SHA-256, computed on the device
--      (`Crypto.digestStringAsync`, lib/store.tsx:340). This migration keeps
--      that format on purpose — the web demo shares this backend and this
--      column, so changing the format breaks it. Upgrading to a salted hash is
--      a separate, coordinated change.
--   3. This password is a shared-device UI lock over the Family section, not an
--      access control. Whoever holds the account's token can read the same data
--      straight from PostgREST. Nothing here changes that, and the product
--      should not describe it as protection against an attacker.
--   4. `verify_family_password` is an oracle. Today that is irrelevant because
--      the hash can simply be read; once 0048 closes that, this RPC needs an
--      attempt limit, alongside the one `redeem_invite` still needs.
--
-- Depends on 0026 (is_household_member) and 0043 (the grant being revoked).

-- set_family_password ---------------------------------------------------------
-- current_hash is required whenever a password is already set. Passing
-- new_hash => null clears it (still requires the current one).

create or replace function public.set_family_password(
  hid uuid,
  new_hash text,
  current_hash text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  stored text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.is_household_member(hid) then
    raise exception 'not a member of this household' using errcode = '42501';
  end if;

  -- The client sends a hex SHA-256 digest, never a plaintext password. Reject
  -- anything else so the column cannot be used as free storage.
  if new_hash is not null and new_hash !~ '^[0-9a-fA-F]{64}$' then
    raise exception 'invalid password hash' using errcode = '22023';
  end if;

  select family_password_hash into stored from households where id = hid;

  if stored is not null then
    if current_hash is null or lower(current_hash) <> lower(stored) then
      raise exception 'incorrect current password' using errcode = '28P01';
    end if;
  end if;

  update households
    set family_password_hash = case when new_hash is null then null else lower(new_hash) end
    where id = hid;
end;
$$;
revoke all on function public.set_family_password(uuid, text, text) from public, anon;
grant execute on function public.set_family_password(uuid, text, text) to authenticated;

-- verify_family_password ------------------------------------------------------
-- Returns true when no password is set, matching the old client behaviour
-- ("nothing to protect").

create or replace function public.verify_family_password(hid uuid, input_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  stored text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.is_household_member(hid) then
    raise exception 'not a member of this household' using errcode = '42501';
  end if;

  select family_password_hash into stored from households where id = hid;
  if stored is null then
    return true;
  end if;
  return input_hash is not null and lower(input_hash) = lower(stored);
end;
$$;
revoke all on function public.verify_family_password(uuid, text) from public, anon;
grant execute on function public.verify_family_password(uuid, text) to authenticated;

-- Close the write path -------------------------------------------------------
-- 0042 revoked table-wide UPDATE and re-granted per column, so UPDATE on
-- `households` is column-level and a single column can be taken back. The RPC
-- above (owner: postgres) is unaffected by this.
--
-- WEB-DEMO COMPAT: if the web demo also writes this column directly, it must
-- move to set_family_password too — it shares this database. Check before
-- deploying if that client is still live.
revoke update (family_password_hash) on public.households from authenticated;

-- Verification (run after applying; expected: zero rows)
--   select grantee, privilege_type
--   from information_schema.column_privileges
--   where table_schema = 'public' and table_name = 'households'
--     and column_name = 'family_password_hash' and grantee = 'authenticated';
