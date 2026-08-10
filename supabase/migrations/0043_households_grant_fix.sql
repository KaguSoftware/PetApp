-- 0042 revoked table-wide UPDATE on households and re-granted only
-- name/units/seen_welcome/current_member_id/country — which broke every other
-- client write the app (and the web demo, same backend) makes by design:
--
--   coins, streak, last_streak_bonus  -> the debounced rewards counter sync
--                                        ("42501 counter sync failed" on every
--                                        log; coins reset on reload)
--   last_seen_at                      -> touched on hydration
--   family_password_hash              -> Settings > Family password
--   premium                           -> the MOCK Peting+ purchase toggle
--
-- Column grants are additive, so this only extends 0042's list.
--
-- SCOPE(EAS cutover): revoke `premium` again once RevenueCat is live — from
-- that point the rc-webhook edge function (service role) is the only writer,
-- and a client that can self-grant premium is a real hole. Owner approved
-- keeping it client-writable until then (2026-08-10).

grant update (
  coins,
  streak,
  last_streak_bonus,
  last_seen_at,
  family_password_hash,
  premium
) on public.households to authenticated;
