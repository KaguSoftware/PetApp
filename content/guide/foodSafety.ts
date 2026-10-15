import type { GuideSection, GuideTopic } from "./types";

const item = (heading: string, body: string): GuideSection => ({ heading, body });

export const FOOD_SAFETY_TOPICS: GuideTopic[] = [
  {
    id: "never-feed-dogs",
    title: "Foods dogs should never eat",
    emoji: "🚫",
    tone: "peach",
    summary: "The kitchen items that are risky for dogs.",
    species: ["dog"],
    readMinutes: 3,
    disclaimer: true,
    sections: [
      item("Xylitol (birch sugar)", "Found in sugar-free gum, some peanut butters and baking. It can drop blood sugar fast and harm the liver. It is one of the most dangerous items in a kitchen."),
      item("Grapes, raisins and sultanas", "Can cause sudden kidney failure in some dogs. There is no known safe amount."),
      item("Chocolate, coffee, energy drinks", "They contain theobromine and caffeine. Darker chocolate is worse, and baking chocolate is risky in small amounts."),
      item("Onion, garlic, leek, chives", "They can damage red blood cells, raw or cooked. Gravy, stock cubes and leftover curry count."),
      item("Cooked bones", "Cooked bones can splinter and injure the gut. Ask your vet before offering any bones."),
      item("Macadamia nuts", "Can cause weakness, tremors and a wobbly gait."),
      {
        heading: "Alcohol and raw yeast dough",
        body: "Dough rises and ferments in the stomach. Both are hard on small bodies.",
        warn: "If your dog may have eaten any of these, call your vet or an animal poison helpline straight away.",
      },
    ],
  },
  {
    id: "never-feed-cats",
    title: "Foods and things cats should avoid",
    emoji: "🚫",
    tone: "pink",
    summary: "Common foods and plants that are risky for cats.",
    species: ["cat"],
    readMinutes: 3,
    disclaimer: true,
    sections: [
      item("Onion, garlic and food cooked with them", "Cats are more sensitive than dogs. Baby food with onion powder is a common hidden source."),
      item("Lilies (any part, including pollen)", "Not food, but one of the most serious poisonings in cats. Even a brushed-past bouquet can be enough, so keep them out of the home."),
      item("Dog food as a staple", "Dog food lacks nutrients cats cannot make themselves, such as taurine. Long term it can cause heart and eye problems."),
      item("Raw fish as a habit", "Raw fish can break down vitamin B1. An occasional cooked fish treat is fine, a raw fish diet is not."),
      item("Milk and cream", "Many adult cats cannot digest lactose well, and it can lead to diarrhea."),
      item("Human painkillers", "Paracetamol and similar medicines are very dangerous to cats. Never give human medicine."),
      {
        heading: "Grapes, raisins, chocolate, xylitol",
        body: "The same list as dogs. Cats eat these less often, but they are not safer for them.",
        warn: "If your cat may have eaten any of these, call your vet or an animal poison helpline straight away.",
      },
    ],
  },
];
