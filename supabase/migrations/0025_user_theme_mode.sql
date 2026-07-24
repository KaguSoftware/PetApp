-- Per-user appearance preference (Settings > General > Appearance). Lives on
-- user_profiles (one row per auth user, already used for active_household_id)
-- rather than on households/members, so it follows the signed-in account
-- across devices instead of being shared by the whole family or reset when
-- switching which household is on-screen.

alter table user_profiles add column if not exists theme_mode text not null default 'light' check (theme_mode in ('light', 'dark'));
