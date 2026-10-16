import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { SectionList, StyleSheet, View } from "react-native";
import { useHousehold, useLogs, useMembers, useMeds, useNotes, usePets } from "@/data";
import {
  buildItems,
  DetailSheet,
  FilterBar,
  filterItems,
  groupByDay,
  HistoryRow,
  PetFeedProbe,
  type CategoryFilter,
  type HistoryItem,
  type PetFeed,
} from "@/components/history";
import { EmptyState, PillButton, ScreenHeader, spacing, Text, useScreenPadding, useTheme } from "@/ui";

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 60;

export default function HistoryScreen() {
  const { colors } = useTheme();
  const padding = useScreenPadding(true);
  const { units } = useHousehold();
  const pets = usePets();
  const members = useMembers();
  const meds = useMeds();
  const notes = useNotes();

  const [base] = useState(() => Date.now());
  const [days, setDays] = useState(WINDOW_DAYS);
  const sinceMs = base - days * DAY_MS;
  const logs = useLogs({ sinceMs });

  const [feeds, setFeeds] = useState<Record<string, PetFeed>>({});
  const onFeed = useCallback((petId: string, feed: PetFeed) => setFeeds((f) => ({ ...f, [petId]: feed })), []);

  const [petId, setPetId] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [selected, setSelected] = useState<HistoryItem | null>(null);

  const petById = useMemo(() => new Map(pets.map((p) => [p.id, p])), [pets]);
  const memberName = useMemo(() => new Map(members.map((m) => [m.id, m.name])), [members]);

  const all = useMemo(() => {
    const petNames = Object.fromEntries(pets.map((p) => [p.id, p.name]));
    return buildItems({ logs, notes, meds, feeds, petNames, units, sinceMs });
  }, [logs, notes, meds, feeds, pets, units, sinceMs]);
  const sections = useMemo(() => groupByDay(filterItems(all, petId, category)), [all, petId, category]);

  const multiPet = pets.length > 1;
  const multiMember = members.length > 1;
  const whoOf = (item: HistoryItem) => (multiMember && item.memberId ? (memberName.get(item.memberId) ?? null) : null);
  const filtered = petId !== null || category !== "all";

  const empty = filtered ? (
    <EmptyState icon="history" title="Nothing here" message="No entries match these filters yet. Try another pet or type." />
  ) : (
    <EmptyState
      icon="history"
      title="Nothing logged yet"
      message="Everything you log for your pet shows up here, day by day."
      actionLabel="Log something"
      onAction={() => router.push("/log")}
    />
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {pets.map((p) => (
        <PetFeedProbe key={p.id} petId={p.id} onFeed={onFeed} />
      ))}
      <SectionList
        sections={sections}
        keyExtractor={(i) => i.key}
        stickySectionHeadersEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, padding]}
        ListHeaderComponent={
          <View style={styles.head}>
            <ScreenHeader title="History" />
            <FilterBar pets={pets} petId={petId} category={category} onPet={setPetId} onCategory={setCategory} />
          </View>
        }
        ListEmptyComponent={empty}
        renderSectionHeader={({ section }) => (
          <View style={[styles.dayHeader, { backgroundColor: colors.bg }]}>
            <Text variant="footnote" tone="ink2" style={styles.dayText} accessibilityRole="header">
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <HistoryRow item={item} pet={petById.get(item.petId)} showPet={multiPet} who={whoOf(item)} onPress={setSelected} />
        )}
        ListFooterComponent={
          all.length > 0 ? (
            <View style={styles.footer}>
              <PillButton
                label="Load older"
                variant="secondary"
                size="sm"
                fullWidth={false}
                onPress={() => setDays((d) => d + WINDOW_DAYS)}
                accessibilityLabel={`Load ${WINDOW_DAYS} older days`}
              />
            </View>
          ) : null
        }
      />
      <DetailSheet
        item={selected}
        pet={selected ? petById.get(selected.petId) : undefined}
        who={selected ? whoOf(selected) : null}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: spacing.xl },
  head: { gap: spacing.md, paddingBottom: spacing.sm },
  dayHeader: { paddingTop: spacing.lg, paddingBottom: spacing.xs },
  dayText: { fontWeight: "600" },
  footer: { paddingTop: spacing.xl, alignItems: "center" },
});
