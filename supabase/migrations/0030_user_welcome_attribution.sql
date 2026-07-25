-- 0030: Per-user welcome flag + real activity attribution.
--
--   * user_profiles.seen_welcome — the intro overlay was gated on the
--     HOUSEHOLD's seen_welcome, so switching to (or joining) a household that
--     hadn't dismissed it re-showed the full intro to a veteran user. The
--     flag now follows the account (same precedent as theme_mode in 0025).
--     households.seen_welcome stays; the web demo keeps using it.
--
--   * activities.user_id — activity rows were attributed only to a member
--     CARD (activities.member_id). With per-person accounts, mobile also
--     stamps which ACCOUNT logged the action. Nullable: old rows, web-demo
--     rows, and pre-migration mobile rows simply have null.
--
-- WEB-DEMO COMPAT: purely additive columns; web inserts omit both and get
-- null / default false.

alter table activities
  add column if not exists user_id uuid references auth.users (id) on delete set null;

alter table user_profiles
  add column if not exists seen_welcome boolean not null default false;
