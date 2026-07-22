-- Households share ONE Supabase login across all local "members" (switching
-- member is just local UI state, not separate auth — see lib/store.tsx
-- switchMember). That means author_user_id = auth.uid() only scopes deletes
-- to the household, not the individual member who actually posted. This adds
-- a member-level attribution snapshot (id + name, like the existing
-- species/breed pattern) so the client can additionally gate deletes by
-- "am I currently viewing as the member who posted this" — a soft, locally
-- trusted UX guard on top of the real household-level RLS boundary, not a
-- replacement for it (there is no way to cryptographically distinguish
-- members sharing one login without separate per-member auth).

alter table forum_posts
  add column author_member_id uuid references members (id) on delete set null,
  add column author_member_name text;

alter table forum_answers
  add column author_member_id uuid references members (id) on delete set null,
  add column author_member_name text;

-- Tighten insert policies so a caller can't attribute a post/answer to a
-- member outside the household they're posting as.
drop policy if exists "forum_posts insert" on forum_posts;
create policy "forum_posts insert" on forum_posts
  for insert with check (
    author_user_id = auth.uid()
    and exists (
      select 1 from household_members hm
      where hm.household_id = forum_posts.author_household_id
        and hm.user_id = auth.uid()
    )
    and (
      author_member_id is null
      or exists (
        select 1 from members m
        where m.id = forum_posts.author_member_id
          and m.household_id = forum_posts.author_household_id
      )
    )
  );

drop policy if exists "forum_answers insert" on forum_answers;
create policy "forum_answers insert" on forum_answers
  for insert with check (
    author_user_id = auth.uid()
    and exists (
      select 1 from household_members hm
      where hm.household_id = forum_answers.author_household_id
        and hm.user_id = auth.uid()
    )
    and (
      author_member_id is null
      or exists (
        select 1 from members m
        where m.id = forum_answers.author_member_id
          and m.household_id = forum_answers.author_household_id
      )
    )
  );
