import { Stack } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { FeaturedCard } from "@/components/guide/FeaturedCard";
import { TopicCard } from "@/components/guide/TopicCard";
import { FEATURED_TOPIC_ID, filterCategories, topicById, type SpeciesFilter } from "@/content/guide";
import { layout, Screen, Text, useHeaderIcon } from "@/ui";

/** "other" = species-agnostic topics, for rabbits, birds, fish and the rest. */
type GuideFilter = SpeciesFilter | "other";

const FILTERS: { id: GuideFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "dog", label: "Dog" },
  { id: "cat", label: "Cat" },
  { id: "other", label: "Other pets" },
];

export default function GuideScreen() {
  const [query, setQuery] = useState("");
  const [species, setSpecies] = useState<GuideFilter>("all");
  const filterIcon = useHeaderIcon(
    species === "all" ? "line.3.horizontal.decrease.circle" : "line.3.horizontal.decrease.circle.fill",
    "filter-list",
  );

  const featured = topicById(FEATURED_TOPIC_ID);
  const showFeatured =
    !!featured && query.trim() === "" && (species !== "other" || !featured.species || featured.species.includes("all"));
  const categories = useMemo(() => {
    let cats = filterCategories(query, species === "other" ? "all" : species);
    if (species === "other") {
      cats = cats
        .map((c) => ({ ...c, topics: c.topics.filter((t) => !t.species || t.species.includes("all")) }))
        .filter((c) => c.topics.length > 0);
    }
    if (!showFeatured) return cats;
    return cats
      .map((c) => ({ ...c, topics: c.topics.filter((t) => t.id !== FEATURED_TOPIC_ID) }))
      .filter((c) => c.topics.length > 0);
  }, [query, species, showFeatured]);

  return (
    <>
      <Stack.Screen options={{ title: "Guide" }} />
      <Stack.SearchBar placeholder="Search the guide" autoCapitalize="none" onChangeText={(e) => setQuery(e.nativeEvent.text)} />
      <Stack.Toolbar placement="right">
        {filterIcon ? (
          <Stack.Toolbar.Menu icon={filterIcon} title="Pets" accessibilityLabel="Filter guide by pet">
            <Stack.Toolbar.Menu inline>
              {FILTERS.map((f) => (
                <Stack.Toolbar.MenuAction key={f.id} isOn={species === f.id} onPress={() => setSpecies(f.id)}>
                  {f.label}
                </Stack.Toolbar.MenuAction>
              ))}
            </Stack.Toolbar.Menu>
          </Stack.Toolbar.Menu>
        ) : null}
      </Stack.Toolbar>
      <Screen tabBarPadding>
        {showFeatured && featured ? <FeaturedCard topic={featured} /> : null}

        {categories.map((c) => (
          <View key={c.id} style={styles.section}>
            <Text variant="footnote" tone="ink2" style={styles.sectionTitle} accessibilityRole="header">
              {c.title}
            </Text>
            {c.topics.map((t) => (
              <TopicCard key={t.id} topic={t} />
            ))}
          </View>
        ))}

        {categories.length === 0 && !showFeatured ? (
          <Text tone="ink2" style={styles.empty}>
            Nothing matches that yet. Try a different word.
          </Text>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: layout.item },
  sectionTitle: { fontWeight: "600" },
  empty: { textAlign: "center", paddingVertical: layout.section },
});
