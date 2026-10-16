import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import type { GuideTopic } from "@/content/guide";
import { Card, Icon, spacing, Text, useTheme } from "@/ui";

export function openTopic(id: string) {
  router.push({ pathname: "/guide/[id]", params: { id } });
}

/** Surface row: title, one-line summary, read time, chevron. */
export function TopicCard({ topic, eyebrow }: { topic: GuideTopic; eyebrow?: string }) {
  const { colors } = useTheme();
  return (
    <Card
      onPress={() => openTopic(topic.id)}
      accessibilityLabel={`${topic.title}. ${topic.summary} ${topic.readMinutes} minute read.`}
      style={styles.card}
    >
      <View style={styles.text}>
        {eyebrow ? (
          <Text variant="caption" tone="ink2">
            {eyebrow}
          </Text>
        ) : null}
        <Text variant="headline">{topic.title}</Text>
        <Text variant="callout" tone="ink2" numberOfLines={2}>
          {topic.summary}
        </Text>
        <Text variant="footnote" tone="ink3">
          {topic.readMinutes} min read
        </Text>
      </View>
      <Icon name="chevron-right" size={18} color={colors.ink3} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.lg, minHeight: 44 },
  text: { flex: 1, gap: 2 },
});
