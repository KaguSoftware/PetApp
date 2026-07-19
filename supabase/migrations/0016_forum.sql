-- Community forum — a cross-household Q&A board (Reddit-style).
-- Additive to the web-demo schema (migrations 0001–0014 + 0015). Owners post a
-- question tied to one of their pets; owners in OTHER households answer; posts
-- and answers can be upvoted. Displayed identity is intentionally minimal:
-- the author's household id ("Family ID") + the pet's species/breed snapshot —
-- never a member name.
--
-- Reads are open to any authenticated user (the forum spans all households);
-- writes are restricted to the author acting as themselves, for a household
-- they actually belong to (checked against household_members, the same table
-- the rest of the app's membership RLS keys off of).

-- gen_random_uuid() lives in pgcrypto; the client also supplies ids explicitly
-- (Crypto.randomUUID), so the default is just a safety net.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table forum_posts (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_household_id uuid not null references households (id) on delete cascade,
  -- Nullable link back to the pet the question is about; the species/breed
  -- below are SNAPSHOTS so the post still renders if the pet is edited/deleted.
  pet_id uuid references pets (id) on delete set null,
  species text not null check (species in ('cat', 'dog')),
  breed text not null,
  title text not null check (char_length(title) between 1 and 200),
  body text not null default '' check (char_length(body) <= 5000),
  -- Denormalized upvote count, kept in sync by the trigger below so the feed
  -- can order by score without aggregating votes.
  score int not null default 0,
  created_at timestamptz not null default now()
);

create index forum_posts_score_idx on forum_posts (score desc, created_at desc);
create index forum_posts_created_idx on forum_posts (created_at desc);

create table forum_answers (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references forum_posts (id) on delete cascade,
  author_user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_household_id uuid not null references households (id) on delete cascade,
  -- Optional pet context for the answerer (they may answer generally).
  pet_id uuid references pets (id) on delete set null,
  species text check (species in ('cat', 'dog')),
  breed text,
  body text not null check (char_length(body) between 1 and 5000),
  score int not null default 0,
  created_at timestamptz not null default now()
);

create index forum_answers_post_idx on forum_answers (post_id, score desc, created_at asc);

-- One upvote row per user per target. Exactly one of post_id/answer_id is set.
create table forum_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  post_id uuid references forum_posts (id) on delete cascade,
  answer_id uuid references forum_answers (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint forum_votes_one_target check ((post_id is not null) <> (answer_id is not null))
);

create unique index forum_votes_user_post_uniq on forum_votes (user_id, post_id) where post_id is not null;
create unique index forum_votes_user_answer_uniq on forum_votes (user_id, answer_id) where answer_id is not null;

-- ---------------------------------------------------------------------------
-- Score maintenance: keep forum_posts.score / forum_answers.score in sync with
-- the number of forum_votes rows pointing at them.
-- ---------------------------------------------------------------------------

create or replace function forum_apply_vote() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.post_id is not null then
      update forum_posts set score = score + 1 where id = new.post_id;
    else
      update forum_answers set score = score + 1 where id = new.answer_id;
    end if;
  elsif tg_op = 'DELETE' then
    if old.post_id is not null then
      update forum_posts set score = score - 1 where id = old.post_id;
    else
      update forum_answers set score = score - 1 where id = old.answer_id;
    end if;
  end if;
  return null;
end;
$$;

create trigger forum_votes_score_aiud
  after insert or delete on forum_votes
  for each row execute function forum_apply_vote();

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------

alter table forum_posts enable row level security;
alter table forum_answers enable row level security;
alter table forum_votes enable row level security;

-- Posts: any authenticated user reads all; write only as yourself, only for a
-- household you belong to; delete only your own.
create policy "forum_posts read" on forum_posts
  for select using (auth.uid() is not null);

create policy "forum_posts insert" on forum_posts
  for insert with check (
    author_user_id = auth.uid()
    and exists (
      select 1 from household_members hm
      where hm.household_id = forum_posts.author_household_id
        and hm.user_id = auth.uid()
    )
  );

create policy "forum_posts delete own" on forum_posts
  for delete using (author_user_id = auth.uid());

-- Answers: same shape as posts.
create policy "forum_answers read" on forum_answers
  for select using (auth.uid() is not null);

create policy "forum_answers insert" on forum_answers
  for insert with check (
    author_user_id = auth.uid()
    and exists (
      select 1 from household_members hm
      where hm.household_id = forum_answers.author_household_id
        and hm.user_id = auth.uid()
    )
  );

create policy "forum_answers delete own" on forum_answers
  for delete using (author_user_id = auth.uid());

-- Votes: a user only ever sees/toggles their OWN vote rows. The public vote
-- total lives in the denormalized score column, so that is all the client needs.
create policy "forum_votes read own" on forum_votes
  for select using (user_id = auth.uid());

create policy "forum_votes insert own" on forum_votes
  for insert with check (user_id = auth.uid());

create policy "forum_votes delete own" on forum_votes
  for delete using (user_id = auth.uid());
