import { useMemo } from "react";
import { cache, useTable } from "./cache";
import { supabase } from "./client";
import { rows } from "./fetch";
import { toMemberCard, toMemberLink } from "./mappers";
import { sessionStore } from "./state";
import { useStore } from "./store";
import type { Member } from "./types";

export async function loadMembers(householdId: string): Promise<void> {
  const ep = cache.epoch();
  const [cards, links] = await Promise.all([
    rows(supabase.from("members").select("*").eq("household_id", householdId).order("created_at").order("id")),
    rows(supabase.from("household_members").select("user_id, role, member_id").eq("household_id", householdId)),
  ]);
  if (cache.epoch() !== ep) return;
  cache.replaceAll("members", cards.map(toMemberCard));
  cache.replaceAll("links", links.map(toMemberLink));
}

export function useMembers(): Member[] {
  const cards = useTable("members");
  const links = useTable("links");
  const userId = useStore(sessionStore).userId;
  return useMemo(() => {
    const byCard = new Map([...links.values()].filter((l) => l.memberId).map((l) => [l.memberId as string, l]));
    return [...cards.values()].map((c) => {
      const link = byCard.get(c.id);
      return {
        id: c.id,
        name: c.name,
        emoji: c.emoji,
        userId: link?.userId ?? null,
        role: link?.role ?? null,
        isMe: link !== undefined && link.userId === userId,
      };
    });
  }, [cards, links, userId]);
}
