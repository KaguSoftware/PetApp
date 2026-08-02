import { supabase } from "@/lib/supabase";
import type { ChatMessage } from "@/lib/chat";

/**
 * Community chat moderation — the client side of migration 0041 plus the
 * wordlist content filter. Together these cover the App Store UGC checklist
 * (guideline 1.2): report objectionable content, block abusive users, filter
 * objectionable material. Like lib/chat.ts this spans all households, so it
 * lives outside the store; screens call these functions directly.
 */

export interface BlockedUser {
  userId: string;
  memberName: string | null;
  createdAt: number;
}

export type ReportReason = "spam" | "harassment" | "hate" | "inappropriate" | "other";

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam or scam" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "hate", label: "Hate speech" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "other", label: "Something else" },
];

type BlockRow = { blocked_user_id: string; blocked_member_name: string | null; created_at: string };

/** True when the backend hasn't run migration 0041 yet (42P01 = table missing). */
export function isModerationUnavailable(e: unknown): boolean {
  return (e as { code?: string } | null)?.code === "42P01";
}

/** Everyone the signed-in user has blocked, newest first. */
export async function fetchBlockedUsers(): Promise<BlockedUser[]> {
  const { data, error } = await supabase
    .from("chat_blocks")
    .select("blocked_user_id, blocked_member_name, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data as BlockRow[] | null) ?? []).map((r) => ({
    userId: r.blocked_user_id,
    memberName: r.blocked_member_name,
    createdAt: new Date(r.created_at).getTime(),
  }));
}

export async function blockUser(input: { userId: string; memberName: string | null }): Promise<void> {
  const { error } = await supabase
    .from("chat_blocks")
    .insert({ blocked_user_id: input.userId, blocked_member_name: input.memberName });
  // 23505 = already blocked — the state the caller wanted.
  if (error && (error as { code?: string }).code !== "23505") throw error;
}

export async function unblockUser(userId: string): Promise<void> {
  const { error } = await supabase.from("chat_blocks").delete().eq("blocked_user_id", userId);
  if (error) throw error;
}

/** Files a report with a full snapshot of the message, so it survives the message (or its author's account) being deleted. */
export async function reportMessage(message: ChatMessage, reason: ReportReason): Promise<void> {
  const { error } = await supabase.from("chat_reports").insert({
    message_id: message.id,
    message_body: message.body,
    message_author_user_id: message.authorUserId,
    message_author_member_name: message.authorMemberName,
    room_id: message.roomId,
    reason,
  });
  // 23505 = this user already reported this message — idempotent success.
  if (error && (error as { code?: string }).code !== "23505") throw error;
}

// ---------------------------------------------------------------------------
// Content filter
// ---------------------------------------------------------------------------

/**
 * Deliberately conservative wordlist: every entry is matched on word
 * boundaries, so ordinary words that merely contain one of these ("class",
 * "shitake" doesn't apply — boundaries, "assistant") never trip it. Entries are
 * regex fragments so a stem can cover its variants.
 */
const BLOCKED_TERMS = [
  "fuck\\w*",
  "shit\\w*",
  "motherfuck\\w*",
  "bullshit\\w*",
  "bitch(?:es|y)?",
  "asshole?s?",
  "ass(?:es)?",
  "bastards?",
  "cunts?",
  "dick(?:head)?s?",
  "cock(?:sucker)?s?",
  "puss(?:y|ies)",
  "whores?",
  "sluts?",
  "twats?",
  "wankers?",
  "pricks?",
  "douche(?:bag)?s?",
  "jackass(?:es)?",
  "nigg(?:er|a)\\w*",
  "fag(?:got)?s?",
  "retard(?:ed|s)?",
  "trann(?:y|ies)",
  "kikes?",
  "spics?",
  "chinks?",
  "wetbacks?",
];

const FILTER_RE = new RegExp(`\\b(?:${BLOCKED_TERMS.join("|")})\\b`, "gi");

/** "fuuuuucckkk" → "fuck": collapse letter runs so elongated spellings still match. */
function collapseRepeats(text: string): string {
  return text.replace(/([a-z])\1+/gi, "$1");
}

/**
 * Gate for outgoing messages: true when the text contains a blocked term,
 * either spelled plainly or stretched with repeated letters. The send flow
 * rejects such messages outright with an error instead of storing them.
 */
export function containsProhibitedContent(text: string): boolean {
  FILTER_RE.lastIndex = 0;
  if (FILTER_RE.test(text)) return true;
  FILTER_RE.lastIndex = 0;
  return FILTER_RE.test(collapseRepeats(text));
}

/**
 * Masks objectionable words ("f***"), leaving the first letter so the sentence
 * still scans. Kept as a render-time safety net for messages that predate the
 * send-time gate or arrive from older clients — the stored data is untouched.
 */
export function censorText(text: string): string {
  return text.replace(FILTER_RE, (match) => match[0] + "*".repeat(match.length - 1));
}
