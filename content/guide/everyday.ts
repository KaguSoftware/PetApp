import type { GuideTopic } from "./types";

export const EVERYDAY_TOPICS: GuideTopic[] = [
  {
    id: "feeding-basics",
    title: "Feeding and portions",
    emoji: "🥣",
    tone: "mint",
    summary: "Right-sized meals are the biggest lever on health.",
    readMinutes: 4,
    illustration: "portion",
    sections: [
      {
        heading: "Get the amount right",
        steps: [
          "Start from the feeding guide on the food label for your pet's target weight.",
          "Adjust to body condition: feel the ribs and watch the waist.",
          "Measure with a cup or scale. Eyeballing tends to drift upward over time.",
        ],
      },
      {
        heading: "Build the routine",
        steps: [
          "Split the daily amount into set meals instead of free-feeding.",
          "Count treats as part of the daily total, not extra.",
          "Switch foods gradually over about a week to avoid tummy upsets.",
        ],
        tip: "Ask your vet what a healthy weight looks like for your pet and adjust from there.",
      },
    ],
  },
  {
    id: "water",
    title: "Water and hydration",
    emoji: "💧",
    tone: "ice",
    summary: "Fresh water, always in reach.",
    readMinutes: 2,
    disclaimer: true,
    sections: [
      {
        heading: "The basics",
        body: "Fresh, clean water should be available all day. Wash bowls daily and refill rather than topping up.",
      },
      {
        heading: "Make drinking easy",
        steps: [
          "Put bowls in a few places around the home. For cats, keep water away from the litter box and food.",
          "Carry water and a collapsible bowl on walks and trips.",
          "Cats often like a fountain or a wide, shallow bowl.",
        ],
        tip: "Wet food adds extra water to the day, which many cats appreciate.",
      },
      {
        heading: "Keep an eye on it",
        body: "Note if your pet starts drinking much more or less than usual. A steady change over a few days is worth mentioning to your vet.",
      },
    ],
  },
  {
    id: "grooming",
    title: "Brushing and grooming",
    emoji: "🪮",
    tone: "pink",
    summary: "Less shedding, fewer mats, a closer bond.",
    readMinutes: 5,
    illustration: "coat",
    sections: [
      {
        heading: "Pick the tool",
        steps: [
          "Short coats: a rubber curry or bristle brush.",
          "Double coats: an undercoat rake, then a slicker brush.",
          "Long coats: a slicker brush plus a comb to find hidden tangles.",
        ],
      },
      {
        heading: "Technique",
        steps: [
          "Brush in the direction the fur grows, in short sections.",
          "Work through tangles gently from the tip inward and never yank a mat.",
          "Check the hidden spots: behind the ears, armpits, belly and tail.",
          "End on a good note with praise and a treat.",
        ],
        tip: "A quick daily brush beats a long weekly battle, and keeps mats from forming.",
      },
    ],
  },
  {
    id: "dental-care",
    title: "Dental care",
    emoji: "🪥",
    tone: "ice",
    summary: "Daily brushing helps prevent painful dental disease.",
    readMinutes: 4,
    illustration: "brush",
    disclaimer: true,
    sections: [
      {
        heading: "Get set up",
        steps: [
          "Use a pet toothbrush (or finger brush) and pet-safe toothpaste.",
          "Let them lick the paste first so the taste becomes a reward.",
        ],
        warn: "Human toothpaste is not safe for pets. Stick to a pet-specific one.",
      },
      {
        heading: "Brush",
        steps: [
          "Lift the lip and rest the brush at about 45 degrees to the gum line.",
          "Brush the outer surfaces in small circles. That is where plaque sits.",
          "Start with a few seconds and build up over a week or two.",
          "Finish with praise and a treat every time.",
        ],
        tip: "Dental chews can help between brushings, but they do not replace the brush.",
      },
      {
        heading: "When to ask your vet",
        body: "Bad breath that does not go away, red or bleeding gums, or reluctance to chew are worth a check.",
      },
    ],
  },
  {
    id: "nail-trimming",
    title: "Nail trimming",
    emoji: "✂️",
    tone: "butter",
    summary: "Trim safely without touching the quick.",
    readMinutes: 4,
    illustration: "nail",
    sections: [
      {
        heading: "Before you cut",
        steps: [
          "Find the quick: the pink area with the blood vessel inside the nail.",
          "On dark nails, trim tiny slivers and stop when you see a grey or pink dot.",
          "Keep styptic powder (or cornstarch) nearby in case you nick it.",
        ],
      },
      {
        heading: "Trim",
        steps: [
          "Hold the paw gently and press the pad to extend the nail.",
          "Cut a small amount at a slight angle, staying well clear of the quick.",
          "If your pet is anxious, do one or two nails a day. It all counts.",
          "Reward calm behavior so the next session is easier.",
        ],
        tip: "If you hear nails clicking on the floor, they are due for a trim.",
      },
    ],
  },
  {
    id: "exercise-play",
    title: "Exercise and play",
    emoji: "🎾",
    tone: "mint",
    summary: "Daily movement keeps bodies and minds happy.",
    readMinutes: 3,
    sections: [
      {
        heading: "Dogs",
        body: "Most dogs do best with a few walks a day plus some play or sniffing time. How much depends on age, size and energy, so watch your dog: eager and content afterwards is a good sign.",
        tip: "Sniffing walks tire out a dog's brain as much as a fast walk tires out the legs.",
      },
      {
        heading: "Cats",
        body: "Short play sessions a couple of times a day mimic hunting: a wand toy, a chase, then a small snack to finish.",
        steps: [
          "Move the toy like prey: dart, hide, pause.",
          "Let your cat win now and then.",
          "Offer perches and scratching posts for solo time.",
        ],
      },
      {
        heading: "Pace yourself",
        body: "Start slowly with puppies, kittens, seniors and pets who have been less active, and build up gradually. Skip hard exercise in very hot weather.",
        warn: "Stop and rest if your pet is panting heavily, limping or lagging behind.",
      },
    ],
  },
];
