import type { GuideTopic } from "./types";

export const HEALTH_TOPICS: GuideTopic[] = [
  {
    id: "weight-check",
    title: "Weight check",
    emoji: "⚖️",
    tone: "peach",
    summary: "A simple weigh-in plus a hands-on body check.",
    readMinutes: 3,
    illustration: "body",
    disclaimer: true,
    sections: [
      {
        heading: "Weigh them",
        steps: [
          "Step on your bathroom scale and note your own weight.",
          "Pick your pet up, weigh yourself holding them, and subtract.",
          "For small pets use a kitchen scale with a towel-lined bowl.",
          "Log the number in the app so you can watch the trend.",
        ],
        tip: "Weigh at the same time of day, ideally before a meal, for comparable numbers.",
      },
      {
        heading: "Body check",
        steps: [
          "Ribs: you should feel them easily under a thin layer, without seeing them.",
          "Waist: looking down, there should be a visible tuck behind the ribs.",
          "Profile: the belly should tuck up, not hang level or sag.",
        ],
      },
      {
        heading: "When to ask your vet",
        body: "Talk to your vet if your pet gains or loses weight steadily without a change in food or activity.",
      },
    ],
  },
  {
    id: "vet-visits",
    title: "Vet visits and vaccines",
    emoji: "🩺",
    tone: "ice",
    summary: "Make routine checkups easy and worthwhile.",
    readMinutes: 3,
    illustration: "vet",
    disclaimer: true,
    sections: [
      {
        heading: "Plan the visit",
        steps: [
          "Book a wellness exam about once a year, and ask your vet if seniors should come more often.",
          "Ask which vaccines and parasite prevention suit your pet and when they are next due.",
          "Bring a list of any changes in eating, drinking or behavior.",
        ],
      },
      {
        heading: "Make it count",
        steps: [
          "Ask about a healthy weight target for your pet.",
          "Ask about dental health and whether a cleaning is due.",
          "Log the visit and next due date so everyone sharing care can see it.",
        ],
        tip: "Snap a photo of anything unusual, like a lump or rash. Vets love context.",
      },
      {
        heading: "Calmer trips",
        body: "Practice short car rides and carrier time at home, and bring treats. Cats often relax in a covered carrier with a familiar blanket.",
      },
    ],
  },
  {
    id: "signs-something-wrong",
    title: "Signs something's wrong",
    emoji: "💛",
    tone: "peach",
    summary: "What to watch for, and when to call your vet.",
    readMinutes: 3,
    disclaimer: true,
    sections: [
      {
        heading: "You know your pet best",
        body: "A change from their normal is often the first clue. If something feels off, it is always fine to call your vet and ask.",
      },
      {
        heading: "Call your vet if you notice",
        steps: [
          "Not eating or drinking for a day or more, or a sudden change in thirst.",
          "Vomiting or diarrhea that keeps happening.",
          "Straining to pee or poop, or going much more or less than usual.",
          "Limping, stiffness or reluctance to jump or climb stairs.",
          "Unusual tiredness, hiding, or a big change in behavior.",
          "Lumps, sore skin, constant scratching, or bad breath that will not go away.",
        ],
      },
      {
        heading: "Call right away if",
        body: "Your pet has trouble breathing, collapses, has a seizure, cannot pass urine, has a swollen belly, or may have eaten something toxic.",
        warn: "Do not wait for symptoms to settle in an emergency. Call your vet or the nearest emergency clinic.",
        tip: "Jot down when it started and anything they ate. It helps your vet.",
      },
    ],
  },
];
