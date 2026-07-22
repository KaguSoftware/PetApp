-- Splits the community feed into two sections ("question" / "pet_care") and
-- lets a Pet caregiver advertise their service as a pet_care post flagged
-- is_caregiver_ad. Ads aren't about one specific pet, so species/breed (until
-- now required on every post) become nullable — CHECK constraints already
-- pass on NULL, so the existing 'cat'/'dog' check is untouched.

alter table forum_posts
  add column category text not null default 'question' check (category in ('question', 'pet_care')),
  add column is_caregiver_ad boolean not null default false,
  alter column species drop not null,
  alter column breed drop not null;

create index forum_posts_category_idx on forum_posts (category, score desc, created_at desc);
