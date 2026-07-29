-- 0040: New MEMBERS could not join a household — `members_write_guard` blocked
-- the member-card insert that every join path performs. Admin invites worked.
--
-- SYMPTOM (owner report): redeeming an invite whose role is 'member' failed
-- with 42501 "only the owner or an admin can manage family cards" — the app
-- showed "Couldn't join right now. Please try again." Selecting **Admin** for
-- the same invite worked every time. The legacy `join_household(uuid)` link
-- (Family ID, also used by the web demo) joins as 'member' and so was broken
-- for everyone.
--
-- ROOT CAUSE — one wrong assumption in 0033. Its guard opens with:
--
--     -- Service role / SECURITY DEFINER RPCs (redeem_invite, …) run without
--     -- an auth.uid() — never block those.
--     if auth.uid() is null then return coalesce(new, old); end if;
--
-- SECURITY DEFINER swaps the effective ROLE (current_user); it does NOT touch
-- the request GUCs. `auth.uid()` reads `request.jwt.claims`, which PostgREST
-- sets per request and which stays populated inside every RPC. So that escape
-- hatch never fires from an RPC — it only ever fires for `anon` (which should
-- be denied) and the SQL editor. When redeem_invite / join_household mint the
-- joiner's card, the guard therefore ran with auth.uid() = THE JOINER:
--
--   * admin invite  → `insert into household_members … role` ran a few
--     statements earlier in the SAME transaction, so has_household_role() sees
--     'admin' → allowed → join completes;
--   * member invite → not owner/admin, and household_members.member_id is only
--     linked AFTER this insert, so the "your own card" branch can't match
--     either → 42501 → the whole redeem_invite transaction rolls back.
--
-- That asymmetry is the entire bug. (With 0037 applied, approve_join_request
-- runs the same insert as the APPROVING owner/admin, so it passes — but the
-- pre-0037 redeem path and join_household stay broken without this fix.)
--
-- FIX: authorise on `current_user`, which is the only reliable signal for
-- "is this a direct client write or trusted server-side code":
--   authenticated / anon → a PostgREST write from a client; guard it.
--   anything else (the RPC owner inside SECURITY DEFINER, service_role, the
--   SQL editor) → trusted, let it through — which is what 0033 intended.
-- That requires the guard itself to be SECURITY INVOKER (inside a SECURITY
-- DEFINER function current_user is always the owner, so a DEFINER guard can
-- never see its caller). The two reads it needs are moved into SECURITY
-- DEFINER helpers, so the guard gains no RLS dependency by giving that up.
--
-- The authorisation RULE for clients is unchanged: owner/admin may manage any
-- card in their household; a plain member may edit only the card their own
-- account is linked to, may not move it to another household, and may not
-- delete it. Only two behaviours change: SECURITY DEFINER RPCs are no longer
-- blocked (the point of this migration), and `anon` is now denied instead of
-- waved through (RLS already blocked it; this closes the paper hole).
--
-- WEB-DEMO COMPAT: strictly permissive for the web demo — its join_household
-- link starts working again, and every direct `members` write it makes is
-- still subject to the same owner/admin-or-own-card rule as before.

-- 1. Ownership read, RLS-independent -----------------------------------------
-- SECURITY DEFINER for the same reason as has_household_role (0026 §1): the
-- guard must see the membership row even when the writer's own RLS wouldn't.

create or replace function public.is_own_member_card(hid uuid, target uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid() and member_id = target
  );
$$;
revoke all on function public.is_own_member_card(uuid, uuid) from public;
grant execute on function public.is_own_member_card(uuid, uuid) to authenticated;

-- 2. The guard ----------------------------------------------------------------

create or replace function public.guard_member_write()
returns trigger
language plpgsql
-- SECURITY INVOKER on purpose (0033 had DEFINER) — see the header: the guard's
-- whole job is to know WHO is writing, and current_user is that signal.
security invoker
set search_path = public
as $$
declare
  hid uuid := coalesce(new.household_id, old.household_id);
  target uuid := coalesce(new.id, old.id);
begin
  -- Trusted server-side contexts: SECURITY DEFINER RPCs (redeem_invite,
  -- join_household, approve_join_request, create_household, delete_household's
  -- cascade, prepare_account_deletion), the service role (Edge Functions,
  -- rc-webhook) and the SQL editor. They authorise the write themselves.
  if current_user not in ('authenticated', 'anon') then
    return coalesce(new, old);
  end if;

  -- A client write with no signed-in user (anon) can never be authorised.
  if auth.uid() is null then
    raise exception 'only the owner or an admin can manage family cards' using errcode = '42501';
  end if;

  if public.has_household_role(hid, array['owner', 'admin']) then
    return coalesce(new, old);
  end if;

  -- A plain member may edit exactly one card: the one their account is linked to.
  if public.is_own_member_card(hid, target) then
    -- ...and may not move it to another household.
    if tg_op = 'UPDATE' and new.household_id is distinct from old.household_id then
      raise exception 'cannot move a card between households' using errcode = '42501';
    end if;
    -- Deleting your own card would orphan your membership; leave_household is
    -- the supported path.
    if tg_op = 'DELETE' then
      raise exception 'only the owner or an admin can remove a card' using errcode = '42501';
    end if;
    return new;
  end if;

  raise exception 'only the owner or an admin can manage family cards' using errcode = '42501';
end;
$$;
grant execute on function public.guard_member_write() to authenticated, anon;

-- Re-assert the binding (create or replace keeps it; restated so the migration
-- is self-contained and re-runnable).
drop trigger if exists members_write_guard on public.members;
create trigger members_write_guard
  before insert or update or delete on public.members
  for each row execute function public.guard_member_write();

-- VERIFY after applying:
--   select proname, prosecdef from pg_proc
--    where proname in ('guard_member_write', 'is_own_member_card');
--   -- expect guard_member_write = f (invoker), is_own_member_card = t (definer)
--
--   select tgname from pg_trigger
--    where tgrelid = 'public.members'::regclass and not tgisinternal;
--   -- expect members_write_guard
--
-- Then, on two phones: owner creates a MEMBER invite → second account redeems
-- it → (approve if 0037 is applied) → they land in the household with their
-- own card. Repeat with an ADMIN invite. Both must work.
