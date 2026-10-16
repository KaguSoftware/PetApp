import { StyleSheet, View } from "react-native";
import type { GuideTopic } from "@/content/guide";
import { layout, Text } from "@/ui";

/** The native header carries the title; this is the summary and read time under it. */
export function ArticleHero({ topic }: { topic: GuideTopic }) {
  return (
    <View style={styles.wrap}>
      <Text tone="ink2">{topic.summary}</Text>
      <Text variant="footnote" tone="ink3">
        {topic.readMinutes} min read
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: layout.headerGap },
});
