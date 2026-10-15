import type { GuideTopic } from "./types";

export const LIFE_STAGE_TOPICS: GuideTopic[] = [
  {
    id: "puppy-kitten",
    title: "Puppies and kittens",
    emoji: "🐣",
    tone: "pink",
    summary: "Little ones need small meals, lots of sleep and gentle starts.",
    readMinutes: 3,
    disclaimer: true,
    sections: [
      {
        heading: "Eating",
        body: "Young pets grow fast. Choose a food made for growth, feed several small meals a day, and ask your vet when to move to fewer meals.",
      },
      {
        heading: "Sleep and play",
        body: "Puppies and kittens sleep a lot, often most of the day. Short play bursts and plenty of rest are normal.",
      },
      {
        heading: "Learning the world",
        steps: [
          "Introduce new people, sounds and surfaces slowly, with treats.",
          "Keep handling positive: paws, ears, mouth, brushing.",
          "Ask your vet about vaccine timing before meeting other animals or visiting busy places.",
        ],
        tip: "Weigh them regularly. Growth is quick, and the app will show the curve.",
      },
    ],
  },
  {
    id: "adult-life",
    title: "Adult pets",
    emoji: "🌿",
    tone: "mint",
    summary: "Keep the routine steady and the weight healthy.",
    readMinutes: 2,
    disclaimer: true,
    sections: [
      {
        heading: "Routine matters",
        body: "Regular meals, daily exercise and play, and a yearly checkup do most of the work.",
      },
      {
        heading: "Watch the waist",
        body: "Adults most often gain weight when portions and treats creep up. A monthly weigh-in helps you catch it early.",
      },
      {
        heading: "Keep it interesting",
        body: "Puzzle feeders, new walking routes and fresh toys keep your pet's mind busy.",
      },
    ],
  },
  {
    id: "senior-care",
    title: "Senior pets",
    emoji: "🌅",
    tone: "butter",
    summary: "Comfort, gentle activity and closer check-ins.",
    readMinutes: 3,
    disclaimer: true,
    sections: [
      {
        heading: "Slower, not less loved",
        body: "Older pets often move more slowly and sleep more. Short, gentle walks and play are still great for them.",
      },
      {
        heading: "Make life comfy",
        steps: [
          "Add a soft, warm bed and non-slip rugs on slick floors.",
          "Use ramps or steps for sofas and cars.",
          "Keep food, water and the litter box easy to reach.",
        ],
      },
      {
        heading: "Check in more often",
        body: "Ask your vet how often seniors should be seen. Mention changes in appetite, thirst, mobility, or confusion early, since many age-related issues are easier to manage when caught sooner.",
        tip: "Keep logging weight. Slow changes show up in the trend.",
      },
    ],
  },
];
