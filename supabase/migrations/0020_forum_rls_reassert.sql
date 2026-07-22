-- Re-assert forum RLS: users have reported being able to delete other
-- households' questions/answers/pet-care ads, which only happens when Row
-- Level Security isn't actually enabled/enforced on these tables (Postgres
-- allows any operation on a table with RLS off, regardless of policies
-- defined on it). This migration is idempotent — safe to re-run even if
-- 0016_forum.sql's RLS was already applied correctly — so it self-heals the
-- live project regardless of what state it's currently in.

alter table forum_posts enable row level security;
alter table forum_answers enable row level security;
alter table forum_votes enable row level security;

drop policy if exists "forum_posts read" on forum_posts;
create policy "forum_posts read" on forum_posts
  for select using (auth.uid() is not null);

drop policy if exists "forum_posts insert" on forum_posts;
create policy "forum_posts insert" on forum_posts
  for insert with check (
    author_user_id = auth.uid()
    and exists (
      select 1 from household_members hm
      where hm.household_id = forum_posts.author_household_id
        and hm.user_id = auth.uid()
    )
  );

drop policy if exists "forum_posts delete own" on forum_posts;
create policy "forum_posts delete own" on forum_posts
  for delete using (author_user_id = auth.uid());

drop policy if exists "forum_answers read" on forum_answers;
create policy "forum_answers read" on forum_answers
  for select using (auth.uid() is not null);

drop policy if exists "forum_answers insert" on forum_answers;
create policy "forum_answers insert" on forum_answers
  for insert with check (
    author_user_id = auth.uid()
    and exists (
      select 1 from household_members hm
      where hm.household_id = forum_answers.author_household_id
        and hm.user_id = auth.uid()
    )
  );

drop policy if exists "forum_answers delete own" on forum_answers;
create policy "forum_answers delete own" on forum_answers
  for delete using (author_user_id = auth.uid());

drop policy if exists "forum_votes read own" on forum_votes;
create policy "forum_votes read own" on forum_votes
  for select using (user_id = auth.uid());

drop policy if exists "forum_votes insert own" on forum_votes;
create policy "forum_votes insert own" on forum_votes
  for insert with check (user_id = auth.uid());

drop policy if exists "forum_votes delete own" on forum_votes;
create policy "forum_votes delete own" on forum_votes
  for delete using (user_id = auth.uid());
