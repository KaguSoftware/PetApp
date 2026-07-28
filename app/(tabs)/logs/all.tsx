import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import ActivityRow from "@/components/ActivityRow";
import EmptyState from "@/components/EmptyState";
import { FadeInItem } from "@/components/Motion";
import PageLoading from "@/components/PageLoading";
import PetSelectorRow from "@/components/PetSelectorRow";
import { PushedScreen } from "@/components/Screen";
import { AccentButton, Group, SectionHeader } from "@/components/ui";
import { dayKey, type Activity } from "@/lib/data";
import { useStore } from "@/lib/store";
import { usePullToRefresh } from "@/lib/useRefresh";
import { useColors, type Colors } from "@/lib/theme";

/**
 * Full per-pet log history — what the Logs tab's "See all logs" button opens
 * once a day's timeline runs past 5 entries. Same day-grouping + paging
 * pattern as /activity (the bell's full history), scoped to one pet at a
 * time via the same roulette selector used on Logs/Care/Pets.
 */
export default function AllLogsScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { state, hydrated, undoLogAction } = useStore();
  const { petId: paramPetId } = useLocalSearchParams<{ petId?: string }>();
  const [petId, setPetId] = useState(paramPetId ?? "");
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

  const activePetId = petId || paramPetId || state.pets[0]?.id || "";
  const pet = state.pets.find((p) => p.id === activePetId) ?? state.pets[0];

  const all = pet ? state.activities.filter((a) => a.petId === pet.id).sort((a, b) => b.ts - a.ts) : [];
  const sorted = all.slice(0, visible);
  const groups: { day: string; items: Activity[] }[] = [];
  for (const a of sorted) {
    const day = dayKey(a.ts);
    const g = groups[groups.length - 1];
    if (g && g.day === day) g.items.push(a);
    else groups.push({ day, items: [a] });
  }

  return (
    <PushedScreen title="All logs" refreshControl={refreshControl}>
      <PetSelectorRow pets={state.pets} selectedId={activePetId} onSelect={setPetId} />

      {!pet ? null : groups.length === 0 ? (
        <EmptyState icon="clock" title="No logs yet" body={`Nothing has been logged for ${pet.name} yet.`} />
      ) : (
        groups.map((g, gi) => (
          <FadeInItem key={g.day} index={gi}>
            <SectionHeader>{g.day}</SectionHeader>
            <Group>
              {g.items.map((a) => {
                const member = state.members.find((m) => m.id === a.memberId);
                const isYou = a.memberId === state.currentMemberId;
                return (
                  <ActivityRow
                    key={a.id}
                    activity={a}
                    pet={pet}
                    member={member}
                    isYou={isYou}
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
