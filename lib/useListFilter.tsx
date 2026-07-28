import { useCallback, useMemo, useState } from "react";
import type { ActionType } from "@/lib/data";

export type TimeRange = "today" | "week" | "all";

/**
 * The shared filter state behind the Notifications and Reminders screens —
 * pet / action-type / tag / time-range. Not persisted: like the per-screen
 * pet selection elsewhere in the app, filters reset when the screen unmounts.
 */
export function useListFilter() {
  const [petId, setPetId] = useState<string | null>(null);
  const [types, setTypes] = useState<Set<ActionType>>(() => new Set());
  const [tags, setTags] = useState<Set<string>>(() => new Set());
  const [range, setRange] = useState<TimeRange>("all");

  const toggleType = useCallback((t: ActionType) => {
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setPetId(null);
    setTypes(new Set());
    setTags(new Set());
    setRange("all");
  }, []);

  const activeCount = (petId ? 1 : 0) + types.size + tags.size + (range !== "all" ? 1 : 0);

  const rangeCutoff = useMemo(() => {
    if (range === "all") return 0;
    const now = new Date();
    if (range === "today") {
      now.setHours(0, 0, 0, 0);
      return now.getTime();
    }
    // "week" — the last 7 days, rolling.
    return Date.now() - 7 * 86_400_000;
  }, [range]);

  return { petId, setPetId, types, toggleType, tags, toggleTag, range, setRange, reset, activeCount, rangeCutoff };
}

export type ListFilter = ReturnType<typeof useListFilter>;
