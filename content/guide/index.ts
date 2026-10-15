import { EVERYDAY_TOPICS } from "./everyday";
import { FOOD_SAFETY_TOPICS } from "./foodSafety";
import { HEALTH_TOPICS } from "./health";
import { LIFE_STAGE_TOPICS } from "./lifeStages";
import { NEW_PET_TOPICS } from "./newPet";
import type { GuideCategory, GuideTopic } from "./types";

export * from "./types";

export const FEATURED_TOPIC_ID = "first-week";

export const GUIDE_CATEGORIES: GuideCategory[] = [
  { id: "new-pet", title: "New pet", topics: NEW_PET_TOPICS },
  { id: "everyday", title: "Everyday care", topics: EVERYDAY_TOPICS },
  { id: "health", title: "Health", topics: HEALTH_TOPICS },
  { id: "food-safety", title: "Food safety", topics: FOOD_SAFETY_TOPICS },
  { id: "life-stages", title: "Life stages", topics: LIFE_STAGE_TOPICS },
];

export const ALL_TOPICS: GuideTopic[] = GUIDE_CATEGORIES.flatMap((c) => c.topics);

export function topicById(id: string | undefined): GuideTopic | undefined {
  return ALL_TOPICS.find((t) => t.id === id);
}

export function categoryOf(topic: GuideTopic): GuideCategory | undefined {
  return GUIDE_CATEGORIES.find((c) => c.topics.some((t) => t.id === topic.id));
}

export type SpeciesFilter = "all" | "dog" | "cat";

function matchesSpecies(topic: GuideTopic, filter: SpeciesFilter): boolean {
  if (filter === "all" || !topic.species || topic.species.includes("all")) return true;
  return topic.species.includes(filter);
}

function matchesQuery(topic: GuideTopic, q: string): boolean {
  if (!q) return true;
  const hay = [topic.title, topic.summary, ...topic.sections.map((s) => s.heading)].join(" ").toLowerCase();
  return hay.includes(q);
}

/** Categories with only the topics that pass the species filter and search text. */
export function filterCategories(query: string, species: SpeciesFilter): GuideCategory[] {
  const q = query.trim().toLowerCase();
  return GUIDE_CATEGORIES.map((c) => ({
    ...c,
    topics: c.topics.filter((t) => matchesSpecies(t, species) && matchesQuery(t, q)),
  })).filter((c) => c.topics.length > 0);
}

/** Up to `limit` other topics: same category first, then the rest. */
export function relatedTopics(topic: GuideTopic, limit = 4): GuideTopic[] {
  const cat = categoryOf(topic);
  const same = cat ? cat.topics.filter((t) => t.id !== topic.id) : [];
  const rest = ALL_TOPICS.filter((t) => t.id !== topic.id && !same.includes(t));
  return [...same, ...rest].slice(0, limit);
}
