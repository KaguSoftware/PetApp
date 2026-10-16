import { StyleSheet, View } from "react-native";
import type { GuideTopic } from "@/content/guide";
import { spacing, Text } from "@/ui";

export function ArticleHero({ topic }: { topic: GuideTopic }) {
  return (
    <View style={styles.wrap}>
      <Text variant="largeTitle" accessibilityRole="header">
        {topic.title}
      </Text>
      <Text tone="ink2">{topic.summary}</Text>
      <Text variant="footnote" tone="ink3">
        {topic.readMinutes} min read
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
});
