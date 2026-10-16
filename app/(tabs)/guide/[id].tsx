import { router, Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { ArticleHero } from "@/components/guide/ArticleHero";
import { SectionBlock } from "@/components/guide/SectionBlock";
import { TopicCard } from "@/components/guide/TopicCard";
import { DISCLAIMER, relatedTopics, topicById } from "@/content/guide";
import { EmptyState, layout, Screen, Text } from "@/ui";

export default function GuideArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const topic = topicById(id);

  if (!topic) {
    return (
      <>
        <Stack.Screen options={{ title: "Guide" }} />
        <Screen tabBarPadding>
          <EmptyState
            icon="guide"
            title="We couldn't find that guide"
            message="It may have moved. Head back to see everything we have."
            actionLabel="Back to the guide"
            onAction={() => router.replace("/guide")}
          />
        </Screen>
      </>
    );
  }

  const related = relatedTopics(topic, 3);
  return (
    <>
      <Stack.Screen options={{ title: topic.title }} />
      <Screen tabBarPadding>
        <ArticleHero topic={topic} />
        {topic.sections.map((s) => (
          <SectionBlock key={s.heading} section={s} />
        ))}
        {topic.disclaimer ? (
          <Text variant="callout" tone="ink3" style={styles.disclaimer}>
            {DISCLAIMER}
          </Text>
        ) : null}
        <View style={styles.related}>
          <Text variant="title" accessibilityRole="header">
            Keep reading
          </Text>
          {related.map((t) => (
            <TopicCard key={t.id} topic={t} />
          ))}
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  disclaimer: { textAlign: "center" },
  related: { gap: layout.item },
});
