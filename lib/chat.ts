import * as Crypto from "expo-crypto";
import { supabase } from "@/lib/supabase";

/**
 * Community chat data layer. Like the forum it replaces (lib/forum.ts), chat
 * spans ALL households — a "global" room every user shares, and one "local"
 * room per country — so it lives outside the store: screens call these
 * functions directly and hold their own local state. Backed by the
 * 0035_chat.sql / 0036_chat_realtime.sql tables; RLS enforces read/write
 * scoped to global rooms and to local rooms matching the caller's household
 * country.
 */

export interface ChatRoom {
  id: string;
  kind: "global" | "local";
  country: string | null;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  authorUserId: string;
  authorHouseholdId: string;
  authorMemberName: string | null;
  body: string;
  createdAt: number;
}

type RoomRow = { id: string; kind: "global" | "local"; country: string | null };
type MessageRow = {
  id: string;
  room_id: string;
  author_user_id: string;
  author_household_id: string;
  author_member_name: string | null;
  body: string;
  created_at: string;
};

function mapRoom(r: RoomRow): ChatRoom {
  return { id: r.id, kind: r.kind, country: r.country };
}

function mapMessage(r: MessageRow): ChatMessage {
  return {
    id: r.id,
    roomId: r.room_id,
    authorUserId: r.author_user_id,
    authorHouseholdId: r.author_household_id,
    authorMemberName: r.author_member_name,
    body: r.body,
    createdAt: new Date(r.created_at).getTime(),
  };
}

/** The single worldwide room. Seeded by migration 0035, so this is a read, not a create. */
export async function getGlobalRoom(): Promise<ChatRoom> {
  const { data, error } = await supabase.from("chat_rooms").select("id, kind, country").eq("kind", "global").single();
  if (error) throw error;
  return mapRoom(data as RoomRow);
}

/** This country's shared room, creating it on first use. */
export async function getOrCreateLocalRoom(country: string): Promise<ChatRoom> {
  const { data: existing, error: readErr } = await supabase
    .from("chat_rooms")
    .select("id, kind, country")
    .eq("kind", "local")
    .eq("country", country)
    .maybeSingle();
  if (readErr) throw readErr;
  if (existing) return mapRoom(existing as RoomRow);

  const { data: created, error: insertErr } = await supabase
    .from("chat_rooms")
    .insert({ id: Crypto.randomUUID(), kind: "local", country })
    .select("id, kind, country")
    .single();
  // 23505 = another client created the same room concurrently; re-fetch instead of failing.
  if (insertErr && (insertErr as { code?: string }).code === "23505") {
    const { data: raced, error: raceErr } = await supabase
      .from("chat_rooms")
      .select("id, kind, country")
      .eq("kind", "local")
      .eq("country", country)
      .single();
    if (raceErr) throw raceErr;
    return mapRoom(raced as RoomRow);
  }
  if (insertErr) throw insertErr;
  return mapRoom(created as RoomRow);
}

/** Most recent messages in a room, oldest first (ready to render top-to-bottom). */
export async function fetchMessages(roomId: string, limit = 100): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, room_id, author_user_id, author_household_id, author_member_name, body, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data as MessageRow[] | null) ?? []).map(mapMessage).reverse();
}

export async function sendMessage(input: { roomId: string; householdId: string; memberName: string | null; body: string }): Promise<ChatMessage> {
  const id = Crypto.randomUUID();
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      id,
      room_id: input.roomId,
      author_household_id: input.householdId,
      author_member_name: input.memberName,
      body: input.body,
    })
    .select("id, room_id, author_user_id, author_household_id, author_member_name, body, created_at")
    .single();
  if (error) throw error;
  return mapMessage(data as MessageRow);
}

/** Live-subscribes to new messages in a room. Returns an unsubscribe function. */
export function subscribeToRoom(roomId: string, onInsert: (message: ChatMessage) => void): () => void {
  const channel = supabase
    .channel(`petpal:chat:${roomId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
      (payload: { new: MessageRow }) => onInsert(mapMessage(payload.new))
    )
    .subscribe();
  // removeChannel, not unsubscribe: matches lib/store.tsx's realtime
  // teardown, dropping the topic so re-subscribing to the same room later
  // (e.g. switching tabs back and forth) doesn't hit a duplicate-topic error.
  return () => {
    supabase.removeChannel(channel);
  };
}
