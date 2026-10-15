import { router } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { SectionList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { EmptyState, PillButton, Screen, spacing, TAB_BAR_CLEARANCE, Text, useTheme } from "@/ui";

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 60;

export default function HistoryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { units } = useHousehold();
  const pets = usePets();
  const members = useMembers();
  const meds = useMeds();
  const notes = useNotes();

  const base = useRef(Date.now()).current;
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
  const now = Date.now();

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
    <EmptyState icon="history" tone="ice" title="Nothing here" message="No entries match these filters yet. Try another pet or type." />
  ) : (
    <EmptyState
      icon="history"
      tone="ice"
      title="Nothing logged yet"
      message="Everything you log for your pet shows up here, day by day."
      actionLabel="Log something"
      onAction={() => router.push("/log")}
    />
  );

  return (
    <Screen title="History" scroll={false} contentStyle={styles.screen}>
      {pets.map((p) => (
        <PetFeedProbe key={p.id} petId={p.id} onFeed={onFeed} />
      ))}
      <SectionList
        sections={sections}
        keyExtractor={(i) => i.key}
        stickySectionHeadersEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
        ListHeaderComponent={
          <FilterBar pets={pets} petId={petId} category={category} onPet={setPetId} onCategory={setCategory} />
        }
        ListEmptyComponent={empty}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        SectionSeparatorComponent={() => <View style={styles.gap} />}
        renderSectionHeader={({ section }) => (
          <View style={[styles.dayHeader, { backgroundColor: colors.bg }]}>
            <Text variant="label" tone="ink2" accessibilityRole="header">
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <HistoryRow
            item={item}
            pet={petById.get(item.petId)}
            showPet={multiPet}
            who={whoOf(item)}
            now={now}
            onPress={setSelected}
          />
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0 },
  gap: { height: spacing.sm },
  dayHeader: { paddingTop: spacing.md, paddingBottom: spacing.sm },
  footer: { paddingTop: spacing.xl, alignItems: "center" },
});
