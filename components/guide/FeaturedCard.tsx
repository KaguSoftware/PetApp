import type { GuideTopic } from "@/content/guide";
import { TopicCard } from "./TopicCard";

/** The "Start here" topic at the top of the guide: a normal row with a small label. */
export function FeaturedCard({ topic }: { topic: GuideTopic }) {
  return <TopicCard topic={topic} eyebrow="Start here" />;
}
