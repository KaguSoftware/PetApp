import * as Crypto from "expo-crypto";
import { supabase } from "@/lib/supabase";

/**
 * Community forum data layer. Unlike the rest of the app (whose AppState is
 * scoped to the ACTIVE household and hydrated in one nested query — see
 * lib/store.tsx `load()`), the forum spans ALL households, so it lives outside
 * the store: screens call these functions directly and hold their own local
 * state, mirroring the app's one-shot-fetch + optimistic-write conventions.
 * Backed by the 0016_forum.sql tables; RLS enforces read-any / write-own.
 */

export type Species = "cat" | "dog";

export interface ForumPost {
  id: string;
  authorUserId: string;
  authorHouseholdId: string;
  species: Species;
  breed: string;
  title: string;
  body: string;
  score: number;
  answerCount: number;
  /** Whether the signed-in user has upvoted this post. */
  votedByMe: boolean;
  createdAt: number;
}

export interface ForumAnswer {
  id: string;
  postId: string;
  authorUserId: string;
  authorHouseholdId: string;
  species: Species | null;
  breed: string | null;
  body: string;
  score: number;
  votedByMe: boolean;
  createdAt: number;
}

export type FeedSort = "top" | "new";

// PostgREST embeds. `my_vote` embeds only the caller's own vote row (RLS scopes
// forum_votes to user_id = auth.uid()), so a non-empty array means "I upvoted".
const POST_SELECT = "id, author_user_id, author_household_id, species, breed, title, body, score, created_at, answer_count:forum_answers(count), my_vote:forum_votes(id)";
const ANSWER_SELECT = "id, post_id, author_user_id, author_household_id, species, breed, body, score, created_at, my_vote:forum_votes(id)";

type PostRow = {
  id: string;
  author_user_id: string;
  author_household_id: string;
  species: Species;
  breed: string;
  title: string;
  body: string;
  score: number;
  created_at: string;
  answer_count: { count: number }[];
  my_vote: { id: string }[];
};

type AnswerRow = {
  id: string;
  post_id: string;
  author_user_id: string;
  author_household_id: string;
  species: Species | null;
  breed: string | null;
  body: string;
  score: number;
  created_at: string;
  my_vote: { id: string }[];
};

function mapPost(r: PostRow): ForumPost {
  return {
    id: r.id,
    authorUserId: r.author_user_id,
    authorHouseholdId: r.author_household_id,
    species: r.species,
    breed: r.breed,
    title: r.title,
    body: r.body,
    score: r.score,
    answerCount: r.answer_count?.[0]?.count ?? 0,
    votedByMe: (r.my_vote?.length ?? 0) > 0,
    createdAt: new Date(r.created_at).getTime(),
  };
}

function mapAnswer(r: AnswerRow): ForumAnswer {
  return {
    id: r.id,
    postId: r.post_id,
    authorUserId: r.author_user_id,
    authorHouseholdId: r.author_household_id,
    species: r.species,
    breed: r.breed,
    body: r.body,
    score: r.score,
    votedByMe: (r.my_vote?.length ?? 0) > 0,
    createdAt: new Date(r.created_at).getTime(),
  };
}

/** All posts, sorted by score ("top") or recency ("new"). */
export async function fetchPosts(sort: FeedSort): Promise<ForumPost[]> {
  let q = supabase.from("forum_posts").select(POST_SELECT);
  q = sort === "top" ? q.order("score", { ascending: false }).order("created_at", { ascending: false }) : q.order("created_at", { ascending: false });
  const { data, error } = await q.limit(100);
  if (error) throw error;
  return ((data as PostRow[] | null) ?? []).map(mapPost);
}

/** A single post plus its answers (highest-scored first), or null if missing. */
export async function fetchPost(id: string): Promise<{ post: ForumPost; answers: ForumAnswer[] } | null> {
  const [{ data: postData, error: postErr }, { data: answerData, error: answerErr }] = await Promise.all([
    supabase.from("forum_posts").select(POST_SELECT).eq("id", id).maybeSingle(),
    supabase.from("forum_answers").select(ANSWER_SELECT).eq("post_id", id).order("score", { ascending: false }).order("created_at", { ascending: true }),
  ]);
  if (postErr) throw postErr;
  if (answerErr) throw answerErr;
  if (!postData) return null;
  return { post: mapPost(postData as PostRow), answers: ((answerData as AnswerRow[] | null) ?? []).map(mapAnswer) };
}

/** Create a question. `author_user_id` defaults to auth.uid() server-side. */
export async function createPost(input: {
  householdId: string;
  petId: string | null;
  species: Species;
  breed: string;
  title: string;
  body: string;
}): Promise<string> {
  const id = Crypto.randomUUID();
  const { error } = await supabase.from("forum_posts").insert({
    id,
    author_household_id: input.householdId,
    pet_id: input.petId,
    species: input.species,
    breed: input.breed,
    title: input.title,
    body: input.body,
  });
  if (error) throw error;
  return id;
}

/** Post an answer to a question. Pet context (species/breed) is optional. */
export async function createAnswer(input: {
  postId: string;
  householdId: string;
  petId?: string | null;
  species?: Species | null;
  breed?: string | null;
  body: string;
}): Promise<string> {
  const id = Crypto.randomUUID();
  const { error } = await supabase.from("forum_answers").insert({
    id,
    post_id: input.postId,
    author_household_id: input.householdId,
    pet_id: input.petId ?? null,
    species: input.species ?? null,
    breed: input.breed ?? null,
    body: input.body,
  });
  if (error) throw error;
  return id;
}

/** Delete one of the caller's own questions. RLS ("forum_posts delete own")
 *  enforces author-only deletion; answers/votes cascade via FK. */
export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase.from("forum_posts").delete().eq("id", id);
  if (error) throw error;
}

/** Delete one of the caller's own answers. RLS restricts this to the author. */
export async function deleteAnswer(id: string): Promise<void> {
  const { error } = await supabase.from("forum_answers").delete().eq("id", id);
  if (error) throw error;
}

/** Toggle the caller's upvote on a post or answer. The score column is kept in
 *  sync by a DB trigger; we only insert/delete the caller's own vote row. */
export async function setVote(target: { postId?: string; answerId?: string }, on: boolean): Promise<void> {
  if (on) {
    const { error } = await supabase.from("forum_votes").insert({
      id: Crypto.randomUUID(),
      post_id: target.postId ?? null,
      answer_id: target.answerId ?? null,
    });
    // 23505 = already voted (unique index). Treat as success — the desired
    // end state (a vote exists) already holds.
    if (error && (error as { code?: string }).code !== "23505") throw error;
  } else {
    // Scope to the caller's own row explicitly. RLS ("delete own") narrows this
    // today, but relying on a policy for correctness means loosening that policy
    // later would silently turn this into a mass-delete that decrements the
    // score by every vote on the target.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    let q = supabase.from("forum_votes").delete().eq("user_id", user.id);
    q = target.postId ? q.eq("post_id", target.postId) : q.eq("answer_id", target.answerId!);
    const { error } = await q;
    if (error) throw error;
  }
}

/** Short shareable label for an author household — "Family #a3f9". */
export function familyLabel(householdId: string): string {
  return `Family #${householdId.slice(0, 4)}`;
}

/** Emoji for a species, for the breed chip. */
export function speciesEmoji(species: Species): string {
  return species === "cat" ? "🐱" : "🐶";
}

/** Compact relative time — "just now", "5m", "3h", "2d", else a date. */
export function relativeTime(ts: number, now: number = Date.now()): string {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
