import { Stack } from "expo-router";

// A nested Stack keeps the tab bar visible on both the topic list and the article.
export default function GuideLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
