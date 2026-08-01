-- Community chat moderation — the App Store UGC requirements (guideline 1.2):
-- users must be able to REPORT objectionable content and BLOCK abusive users.
-- (The third leg, content filtering, is client-side — lib/moderation.ts.)
--
-- Additive only. Both tables are strictly own-rows under RLS: nobody can see
-- who blocked them or who reported what. Reports are an immutable log reviewed
-- with the service role / dashboard — no client update or delete policies.

-- ---------------------------------------------------------------------------
-- Blocks: "I don't want to see anything this user posts."
-- ---------------------------------------------------------------------------

create table if not exists chat_blocks (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  blocked_user_id uuid not null references auth.users (id) on delete cascade,
  -- Display-name snapshot at block time so the "Blocked users" manage list can
  -- label rows without a cross-user profile read (chat has no public profiles).
  blocked_member_name text,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_user_id),
  constraint chat_blocks_not_self check (user_id <> blocked_user_id)
);

alter table chat_blocks enable row level security;

drop policy if exists "chat_blocks read own" on chat_blocks;
create policy "chat_blocks read own" on chat_blocks
  for select using (user_id = auth.uid());

drop policy if exists "chat_blocks insert own" on chat_blocks;
create policy "chat_blocks insert own" on chat_blocks
  for insert with check (user_id = auth.uid());

drop policy if exists "chat_blocks delete own" on chat_blocks;
create policy "chat_blocks delete own" on chat_blocks
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Reports: "this message is objectionable — review it."
-- ---------------------------------------------------------------------------

create table if not exists chat_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- SET NULL, not CASCADE: a report must outlive the message it's about (the
  -- author deleting the account, or the message going away, is exactly when the
  -- snapshots below become the only evidence a moderator has).
  message_id uuid references chat_messages (id) on delete set null,
  message_body text not null,
  message_author_user_id uuid,
  message_author_member_name text,
  room_id uuid,
  reason text not null check (reason in ('spam', 'harassment', 'hate', 'inappropriate', 'other')),
  created_at timestamptz not null default now()
);

-- One report per user per message (repeat taps are idempotent client-side).
create unique index if not exists chat_reports_once_per_message
  on chat_reports (reporter_user_id, message_id) where message_id is not null;

alter table chat_reports enable row level security;

drop policy if exists "chat_reports insert own" on chat_reports;
create policy "chat_reports insert own" on chat_reports
  for insert with check (reporter_user_id = auth.uid());

-- Readable so the client can tell "already reported" apart from a failure;
-- still own-rows only.
drop policy if exists "chat_reports read own" on chat_reports;
create policy "chat_reports read own" on chat_reports
  for select using (reporter_user_id = auth.uid());
