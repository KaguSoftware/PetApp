import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { FeaturedCard } from "@/components/guide/FeaturedCard";
import { TopicCard } from "@/components/guide/TopicCard";
import { FEATURED_TOPIC_ID, filterCategories, topicById, type SpeciesFilter } from "@/content/guide";
import { Chip, Screen, Text, TextField, spacing } from "@/ui";

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
    <Screen title="Guide" tabBarPadding>
      <TextField
        value={query}
        onChangeText={setQuery}
        placeholder="Search the guide"
        accessibilityLabel="Search the guide"
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {FILTERS.map((f) => (
          <Chip key={f.id} label={f.label} selected={species === f.id} onPress={() => setSpecies(f.id)} />
        ))}
      </ScrollView>

      {showFeatured && featured ? <FeaturedCard topic={featured} /> : null}

      {categories.map((c) => (
        <View key={c.id} style={styles.section}>
          <Text variant="heading" accessibilityRole="header">
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
  );
}

const styles = StyleSheet.create({
  chips: { gap: spacing.sm, paddingVertical: 4 },
  section: { gap: spacing.md, marginTop: spacing.sm },
  empty: { textAlign: "center", paddingVertical: spacing["3xl"] },
});
