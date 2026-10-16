import { StyleSheet, View } from "react-native";
import type { GuideTopic } from "@/content/guide";
import { Card, PillButton, Text } from "@/ui";
import { EmojiDisc, openTopic } from "./TopicCard";

/** The "Start here" hero at the top of the guide. */
export function FeaturedCard({ topic }: { topic: GuideTopic }) {
  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <View style={styles.text}>
          <Text variant="caption" tone="ink2">
            START HERE
          </Text>
          <Text variant="title" accessibilityRole="header">
            {topic.title}
          </Text>
          <Text variant="callout" tone="ink2">
            {topic.summary}
          </Text>
        </View>
        <EmojiDisc emoji={topic.emoji} size={64} />
      </View>
      <PillButton label="Read the checklist" onPress={() => openTopic(topic.id)} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 16 },
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  text: { flex: 1, gap: 4 },
});
