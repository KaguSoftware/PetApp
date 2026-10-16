/** Legacy per-topic accent; the monochrome design ignores it. */
type Tone = string;

export type GuideSpecies = "dog" | "cat" | "all";

export type IllustrationId = "body" | "brush" | "nail" | "coat" | "portion" | "vet";

export interface GuideSection {
  heading: string;
  body?: string;
  steps?: string[];
  tip?: string;
  warn?: string;
}

export interface GuideTopic {
  /** Stable slug used in the route. Never rename. */
  id: string;
  title: string;
  emoji: string;
  tone: Tone;
  summary: string;
  species?: GuideSpecies[];
  readMinutes: number;
  sections: GuideSection[];
  illustration?: IllustrationId;
  /** Shows the "general information, not veterinary advice" line. */
  disclaimer?: boolean;
}

export type GuideCategoryId = "new-pet" | "everyday" | "health" | "food-safety" | "life-stages";

export interface GuideCategory {
  id: GuideCategoryId;
  title: string;
  topics: GuideTopic[];
}

export const DISCLAIMER = "This guide is general information, not veterinary advice.";
