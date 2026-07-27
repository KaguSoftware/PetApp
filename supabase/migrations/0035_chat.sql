-- Community chat — replaces the Q&A forum (0016_forum.sql) with two live chat
-- surfaces: one "global" room every signed-in user shares, and one "local"
-- room per country. A household's country is picked in Settings and can
-- change at any time; local-room membership always follows whatever country
-- is currently set.
--
-- The forum tables/data from 0016/0019-0021 are left untouched — this is
-- purely additive, no drops.

-- gen_random_uuid() lives in pgcrypto; the client also supplies ids explicitly
-- (Crypto.randomUUID), so the default is just a safety net. No SECURITY
-- DEFINER function here needs pgcrypto's gen_random_bytes/digest/crypt/hmac,
-- so the `search_path = public, extensions` rule doesn't apply — only
-- gen_random_uuid() is used, which is in pg_catalog since PG13 and always on
-- the path regardless.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- households.country
-- ---------------------------------------------------------------------------

alter table households add column if not exists country text;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table chat_rooms (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('global', 'local')),
  -- Null for the single global room; an ISO 3166-1 alpha-2 code for local rooms.
  country text,
  created_at timestamptz not null default now(),
  constraint chat_rooms_kind_country check (
    (kind = 'global' and country is null) or (kind = 'local' and country is not null)
  )
);

-- One room per kind+country: global has exactly one row (country is null,
-- and a plain unique index treats all-NULL as distinct, so this partial index
-- is scoped to the global row via a fixed expression instead).
create unique index chat_rooms_global_uniq on chat_rooms (kind) where kind = 'global';
create unique index chat_rooms_local_country_uniq on chat_rooms (country) where kind = 'local';

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references chat_rooms (id) on delete cascade,
  author_user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_household_id uuid not null references households (id) on delete cascade,
  -- Snapshot, same reasoning as forum_posts.author_member_name: a household is
  -- one shared login, so this is what tells messages from different family
  -- members apart in the same room.
  author_member_name text,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index chat_messages_room_created_idx on chat_messages (room_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------

alter table chat_rooms enable row level security;
alter table chat_messages enable row level security;

-- Room list itself isn't sensitive — any authenticated user can see which
-- rooms exist (message content is what's actually gated).
create policy "chat_rooms read" on chat_rooms
  for select using (auth.uid() is not null);

create policy "chat_rooms insert" on chat_rooms
  for insert with check (auth.uid() is not null);

-- Messages: global-room messages are readable/writable by any authenticated
-- user; local-room messages require the author's household to currently be
-- set to that room's country.
create policy "chat_messages read" on chat_messages
  for select using (
    exists (
      select 1 from chat_rooms r
      where r.id = chat_messages.room_id
        and (
          r.kind = 'global'
          or exists (
            select 1 from household_members hm
            join households h on h.id = hm.household_id
            where hm.user_id = auth.uid() and h.country = r.country
          )
        )
    )
  );

create policy "chat_messages insert" on chat_messages
  for insert with check (
    author_user_id = auth.uid()
    and exists (
      select 1 from household_members hm
      where hm.household_id = chat_messages.author_household_id
        and hm.user_id = auth.uid()
    )
    and exists (
      select 1 from chat_rooms r
      where r.id = chat_messages.room_id
        and (
          r.kind = 'global'
          or exists (
            select 1 from household_members hm
            join households h on h.id = hm.household_id
            where hm.user_id = auth.uid() and h.country = r.country
          )
        )
    )
  );

-- Seed the single global room up front so the client never races to create it.
insert into chat_rooms (kind, country) values ('global', null)
  on conflict (kind) where kind = 'global' do nothing;
