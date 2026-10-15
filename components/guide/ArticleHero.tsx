import { StyleSheet, View } from "react-native";
import type { GuideTopic } from "@/content/guide";
import { Card, Text, useTheme } from "@/ui";
import { GuideIllustration } from "./illustrations";
import { EmojiDisc } from "./TopicCard";

export function ArticleHero({ topic }: { topic: GuideTopic }) {
  const { colors } = useTheme();
  return (
    <Card tone={topic.tone} style={styles.card}>
      {topic.illustration ? (
        <View style={[styles.art, { backgroundColor: colors.tones[topic.tone].bg }]}>
          <GuideIllustration id={topic.illustration} />
        </View>
      ) : (
        <EmojiDisc emoji={topic.emoji} size={88} />
      )}
      <Text variant="title" accessibilityRole="header" style={styles.center}>
        {topic.title}
      </Text>
      <Text tone="ink2" style={styles.center}>
        {topic.summary}
      </Text>
      <Text variant="caption" tone="ink2">
        {topic.readMinutes} min read
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", gap: 10 },
  art: { width: "100%", alignItems: "center", paddingVertical: 8 },
  center: { textAlign: "center" },
});
