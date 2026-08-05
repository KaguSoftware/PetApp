import { useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import ActivityRow from "@/components/ActivityRow";
import EmptyState from "@/components/EmptyState";
import { FadeInItem } from "@/components/Motion";
import PageLoading from "@/components/PageLoading";
import { PushedScreen } from "@/components/Screen";
import { AccentButton, Group, SectionHeader } from "@/components/ui";
import { dayKey, type Activity } from "@/lib/data";
import { useStore } from "@/lib/store";
import { usePullToRefresh } from "@/lib/useRefresh";
import { useColors, type Colors } from "@/lib/theme";

/**
 * Full log history for the household — what the Logs dashboard's "See all"
 * opens once a day's timeline runs past six entries. Same day-grouping and
 * paging as /inbox (the bell's full history), and like the dashboard it
 * covers every pet at once: each row already names the pet it was for, so a
 * per-pet selector would only ever hide entries.
 */
export default function AllLogsScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { state, hydrated, undoLogAction } = useStore();
  const [visible, setVisible] = useState(40);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const refreshControl = usePullToRefresh();

  if (!hydrated) {
    return (
      <PushedScreen title="All logs" refreshControl={refreshControl}>
        <PageLoading />
      </PushedScreen>
    );
  }

  const all = [...state.activities].sort((a, b) => b.ts - a.ts);
  const groups: { day: string; items: Activity[] }[] = [];
  for (const a of all.slice(0, visible)) {
    const day = dayKey(a.ts);
    const g = groups[groups.length - 1];
    if (g && g.day === day) g.items.push(a);
    else groups.push({ day, items: [a] });
  }

  return (
    <PushedScreen title="All logs" refreshControl={refreshControl}>
      {groups.length === 0 ? (
        <EmptyState icon="clock" title="No logs yet" body="Care you log from the Logs tab shows up here, newest first." />
      ) : (
        groups.map((g, gi) => (
          <FadeInItem key={g.day} index={gi}>
            <SectionHeader>{g.day}</SectionHeader>
            <Group>
              {g.items.map((a) => {
                const pet = state.pets.find((p) => p.id === a.petId);
                if (!pet) return null;
                return (
                  <ActivityRow
                    key={a.id}
                    activity={a}
                    pet={pet}
                    member={state.members.find((m) => m.id === a.memberId)}
                    isYou={a.memberId === state.currentMemberId}
                    expanded={expandedId === a.id}
                    onToggleExpand={() => setExpandedId(expandedId === a.id ? null : a.id)}
                    onUndo={undoLogAction}
                  />
                );
              })}
            </Group>
          </FadeInItem>
        ))
      )}

      {visible < all.length ? (
        <AccentButton variant="tinted" size="sm" style={styles.showMore} onPress={() => setVisible((v) => v + 40)}>
          Show more
        </AccentButton>
      ) : null}
    </PushedScreen>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    showMore: { marginTop: 12 },
  });
