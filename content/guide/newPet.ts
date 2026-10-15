import type { GuideTopic } from "./types";

export const NEW_PET_TOPICS: GuideTopic[] = [
  {
    id: "first-week",
    title: "Your first week together",
    emoji: "🏡",
    tone: "butter",
    summary: "A gentle checklist for the first seven days.",
    readMinutes: 4,
    sections: [
      {
        heading: "Before they arrive",
        steps: [
          "Set up a quiet corner with a bed, fresh water and a food bowl.",
          "Put away anything chewable or toxic: cables, medicines, cleaning products, small objects.",
          "Pick a food and ask the breeder, shelter or previous owner what they have been eating.",
        ],
      },
      {
        heading: "Day one",
        body: "Keep it calm. Let your pet sniff around at their own pace and skip the visitors for now.",
        steps: [
          "Show them where food, water and their bed are.",
          "Dogs: offer a toilet break outside often, and after every meal and nap.",
          "Cats: show them the litter box, then give them space.",
        ],
        tip: "Stick with their old food for the first few days, then switch slowly over a week.",
      },
      {
        heading: "Days two to four",
        steps: [
          "Pick a simple routine for meals, play and toilet breaks, and keep it steady.",
          "Start short, happy handling: paws, ears, a gentle brush.",
          "Book a first vet visit if you have not already.",
        ],
      },
      {
        heading: "Days five to seven",
        steps: [
          "Add short, easy training sessions with treats and lots of praise.",
          "Note what they like, what worries them and how they sleep.",
          "Log meals, water and walks in the app so you can spot patterns early.",
        ],
        tip: "Settling in takes weeks, not days. Hiding, clinginess or a wobbly appetite at first are common.",
      },
    ],
  },
];
