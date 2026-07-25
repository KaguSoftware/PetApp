-- 0026: Role enforcement — owner/admin/member become real security boundaries.
--
-- Until now every policy was binary member/non-member, and the "update own
-- membership" policy let any member UPDATE their own household_members row —
-- including role (self-promotion, documented as accepted in 0011). This
-- migration makes household_members.role trustworthy:
--
--   * has_household_role() helper (recursion-safe, like is_household_member)
--   * column-level UPDATE grant: authenticated may only write member_id on
--     household_members (the web demo's per-user "view as" pointer keeps
--     working); role/joined_at become writable only via SECURITY DEFINER RPCs
--   * leave/remove semantics on household_members DELETE
--   * households: DELETE becomes owner-only; rename becomes admin+ (trigger,
--     so coins/streak/premium/last_seen writes by members are untouched)
--   * members: a card claimed by an account can't be deleted directly
--   * households.owner_id UNIQUE dropped — a user may now own several
--     households (create_household RPC arrives in 0028)
--
-- WEB-DEMO COMPAT: the web client never updates role client-side, never
-- renames/deletes households, and writes member_id via "view as" (still
-- granted). Its signup trigger + join_household RPC are SECURITY DEFINER and
-- unaffected by the column revoke. One intended behavior change: deleting a
-- member CARD that an account has claimed now errors (web shows its generic
-- error toast) — that card is someone's identity; remove the member instead.

-- 1. Role helper -------------------------------------------------------------
-- SECURITY DEFINER for the same reason as is_household_member (0011 §3): its
-- inner read of household_members skips that table's own RLS, so policies on
-- household_members itself may call it without 42P17 recursion.

create or replace function public.has_household_role(hid uuid, roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid() and role = any (roles)
  );
$$;
revoke all on function public.has_household_role(uuid, text[]) from public;
grant execute on function public.has_household_role(uuid, text[]) to authenticated;

-- 2. Close the self-promotion hole with column-level privileges ---------------
-- The row-scope policy ("your own row") stays; the writable column set shrinks
-- to member_id. Any UPDATE touching role now fails with "permission denied for
-- table household_members" regardless of RLS. SECURITY DEFINER functions
-- (join_household, the 0027/0028 RPCs, add_owner_membership) are unaffected.

revoke update on table public.household_members from authenticated, anon;
grant update (member_id) on table public.household_members to authenticated;

-- 3. Leave/remove semantics on household_members ------------------------------
--   * anyone may delete their OWN non-owner row (leave)
--   * the owner may delete any non-owner row
--   * admins may delete member rows
-- The owner's row only ever moves via transfer_ownership / prepare_account_
-- deletion (0028), so ownership can't be orphaned by a stray DELETE.

drop policy if exists "leave household" on household_members;
create policy "leave household" on household_members
  for delete using (
    (user_id = auth.uid() and role <> 'owner')
    or (public.has_household_role(household_id, array['owner']) and role <> 'owner')
    or (public.has_household_role(household_id, array['owner', 'admin']) and role = 'member')
  );

-- 4. households: split the FOR ALL policy so DELETE is owner-only -------------
-- SELECT/UPDATE stay membership-wide (members write coins/streak/units/premium
-- countersync exactly as before). INSERT keeps the bootstrap escape hatch from
-- 0011 (creator inserts before the owner-membership trigger row is visible).

drop policy if exists "member household" on households;

create policy "member household select" on households
  for select using (public.is_household_member(id));

create policy "member household insert" on households
  for insert with check (public.is_household_member(id) or owner_id = auth.uid());

create policy "member household update" on households
  for update using (public.is_household_member(id))
  with check (public.is_household_member(id));

create policy "owner household delete" on households
  for delete using (public.has_household_role(id, array['owner']));

-- 5. Rename is admin+ ----------------------------------------------------------
-- A trigger rather than a policy so the frequent member-level counter writes
-- (coins/xp/streak/last_seen_at/seen_welcome/premium/units) stay untouched.
-- auth.uid() is null for service-role / cascade / SQL-editor paths — allowed.

create or replace function public.guard_household_rename()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and not public.has_household_role(new.id, array['owner', 'admin']) then
    raise exception 'only the owner or an admin can rename the household'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists households_rename_guard on households;
create trigger households_rename_guard
  before update of name on households
  for each row
  when (old.name is distinct from new.name)
  execute function public.guard_household_rename();

-- 6. A claimed card is someone's identity — no direct deletes -----------------
-- Skips when the parent household row is already gone (i.e. we're inside a
-- household-delete cascade, where household_members rows may not have been
-- cascaded yet), and for service-role/admin paths (auth.uid() is null).
--
-- Only OTHER users' pointers count as claims: the web demo persists its
-- per-user "view as" into household_members.member_id, so a card the deleter
-- merely viewed as must stay deletable (their pointer FK sets itself null).

create or replace function public.guard_claimed_card_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and exists (select 1 from households where id = old.household_id)
     and exists (select 1 from household_members
                 where member_id = old.id and user_id <> auth.uid()) then
    raise exception 'this member is linked to an account — remove the member from the household instead'
      using errcode = '42501';
  end if;
  return old;
end;
$$;

drop trigger if exists members_claimed_delete_guard on members;
create trigger members_claimed_delete_guard
  before delete on members
  for each row execute function public.guard_claimed_card_delete();

-- 7. A user may own more than one household ------------------------------------
-- owner_id stays NOT NULL (permanent creator/billing record; rc-webhook keys
-- premium off it) and keeps ON DELETE CASCADE (prepare_account_deletion in
-- 0028 reassigns or deletes every owned household before the auth user goes).
--
-- The web demo's bootstrapHousehold() DEPENDS on the unique violation: its
-- recovery path is `insert → on 23505 → reselect by owner_id`, and without it
-- a transient fetch failure would silently create a duplicate fully-seeded
-- household. So the constraint is replaced by a trigger that raises the SAME
-- errcode for a second owned household on DIRECT inserts — only the
-- create_household() RPC (0028), which sets a transaction-local flag, may
-- create additional owned households. Web behavior is bit-for-bit unchanged.

alter table households drop constraint if exists households_owner_id_key;
create index if not exists households_owner_id_idx on households (owner_id);

create or replace function public.guard_single_owned_household()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('petpal.allow_multi_household', true), '') <> 'on'
     and auth.uid() is not null
     and exists (select 1 from households where owner_id = new.owner_id) then
    raise unique_violation using
      message = 'duplicate key value violates unique constraint "households_owner_id_key"',
      constraint = 'households_owner_id_key';
  end if;
  return new;
end;
$$;

drop trigger if exists households_single_owned_guard on households;
create trigger households_single_owned_guard
  before insert on households
  for each row execute function public.guard_single_owned_household();
