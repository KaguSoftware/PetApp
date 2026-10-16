import { router, Stack } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { SectionList, StyleSheet, View } from "react-native";
import { useHousehold, useLogs, useMembers, useMeds, useNotes, usePets } from "@/data";
import {
  buildItems,
  CATEGORY_LABEL,
  filterItems,
  groupByDay,
  HistoryRow,
  itemRoute,
  PetFeedProbe,
  type CategoryFilter,
  type HistoryItem,
  type PetFeed,
} from "@/components/history";
import { EmptyState, layout, PillButton, Text, useContentPadding, useHeaderIcon, useTheme } from "@/ui";

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 60;
const TYPES: CategoryFilter[] = ["all", "care", "weight", "health", "notes"];

export default function HistoryScreen() {
  const { colors } = useTheme();
  const padding = useContentPadding({ tabBarPadding: true });
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
  const activeLine = [petId ? petById.get(petId)?.name : null, category !== "all" ? CATEGORY_LABEL[category] : null]
    .filter(Boolean)
    .join(" · ");

  const filterIcon = useHeaderIcon(
    filtered ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle",
    "filter-list",
  );

  const open = (item: HistoryItem) => {
    const { kind, id, petId: pid } = itemRoute(item);
    router.push({ pathname: "/history/[kind]/[id]", params: { kind, id, petId: pid } });
  };

  const empty = filtered ? (
    <EmptyState icon="history" title="Nothing here" message="No entries match this filter yet. Try another pet or type." />
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
    <>
      <Stack.Screen options={{ title: "History" }} />
      <Stack.Toolbar placement="right">
        {filterIcon ? (
          <Stack.Toolbar.Menu icon={filterIcon} title="Filter" accessibilityLabel="Filter history">
            {multiPet ? (
              <Stack.Toolbar.Menu inline title="Pet">
                <Stack.Toolbar.MenuAction isOn={petId === null} onPress={() => setPetId(null)}>
                  All pets
                </Stack.Toolbar.MenuAction>
                {pets.map((p) => (
                  <Stack.Toolbar.MenuAction key={p.id} isOn={petId === p.id} onPress={() => setPetId(p.id)}>
                    {p.name}
                  </Stack.Toolbar.MenuAction>
                ))}
              </Stack.Toolbar.Menu>
            ) : null}
            <Stack.Toolbar.Menu inline title="Type">
              {TYPES.map((t) => (
                <Stack.Toolbar.MenuAction key={t} isOn={category === t} onPress={() => setCategory(t)}>
                  {CATEGORY_LABEL[t]}
                </Stack.Toolbar.MenuAction>
              ))}
            </Stack.Toolbar.Menu>
          </Stack.Toolbar.Menu>
        ) : null}
      </Stack.Toolbar>
      <View collapsable={false} style={[styles.root, { backgroundColor: colors.bg }]}>
        {pets.map((p) => (
          <PetFeedProbe key={p.id} petId={p.id} onFeed={onFeed} />
        ))}
        <SectionList
          sections={sections}
          keyExtractor={(i) => i.key}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[styles.content, padding]}
          ListHeaderComponent={
            filtered ? (
              <Text variant="callout" tone="ink2" style={styles.active} accessibilityLabel={`Showing ${activeLine}`}>
                {activeLine}
              </Text>
            ) : null
          }
          ListEmptyComponent={empty}
          renderSectionHeader={({ section }) => (
            <View
              style={[
                styles.dayHeader,
                { backgroundColor: colors.bg, paddingTop: section === sections[0] ? 0 : layout.section },
              ]}
            >
              <Text variant="footnote" tone="ink2" style={styles.dayText} accessibilityRole="header">
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <HistoryRow item={item} pet={petById.get(item.petId)} showPet={multiPet} who={whoOf(item)} onPress={open} />
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
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: layout.gutter },
  active: { paddingBottom: layout.item },
  dayHeader: { paddingBottom: layout.headerGap },
  dayText: { fontWeight: "600" },
  footer: { paddingTop: layout.section, alignItems: "center" },
});
