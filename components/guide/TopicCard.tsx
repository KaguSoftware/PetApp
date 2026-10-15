import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import type { GuideTopic } from "@/content/guide";
import { Card, Text, useTheme } from "@/ui";

export function openTopic(id: string) {
  router.push({ pathname: "/guide/[id]", params: { id } });
}

/** A pastel disc holding the topic emoji. */
export function EmojiDisc({ emoji, size = 52 }: { emoji: string; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.disc, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={{ fontSize: size * 0.5, lineHeight: size * 0.62 }}>{emoji}</Text>
    </View>
  );
}

export function TopicCard({ topic }: { topic: GuideTopic }) {
  return (
    <Card
      tone={topic.tone}
      onPress={() => openTopic(topic.id)}
      accessibilityLabel={`${topic.title}. ${topic.summary} ${topic.readMinutes} minute read.`}
      style={styles.card}
    >
      <EmojiDisc emoji={topic.emoji} />
      <View style={styles.text}>
        <Text variant="label">{topic.title}</Text>
        <Text variant="small" tone="ink2">
          {topic.summary}
        </Text>
        <Text variant="caption" tone="ink2">
          {topic.readMinutes} min read
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, minHeight: 44 },
  disc: { alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 2 },
});
