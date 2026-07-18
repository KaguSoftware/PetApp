-- Expo push tokens for the mobile app (additive — the web demo is unaffected).
-- One row per (user, token); a user can have several devices. Tokens are
-- registered from EAS dev/production builds only (Expo Go can't get one) and
-- consumed by the send-due-reminders Edge Function.

create table push_tokens (
  user_id uuid not null references auth.users (id) on delete cascade,
  expo_token text not null,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now(),
  primary key (user_id, expo_token)
);

alter table push_tokens enable row level security;

-- Owner-only: a user manages exactly their own device tokens.
create policy "own push tokens" on push_tokens
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
