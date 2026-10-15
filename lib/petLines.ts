import type { MascotMood } from "@/components/mascot";
import type { Species } from "@/data";
import type { ReactionSource } from "./reactions";

type Bank = readonly string[];

const GENERIC_REACTIONS: Record<Exclude<ReactionSource, "tap">, Bank> = {
  fed: [
    "Crunchy! Best meal ever 🐾",
    "Nom nom nom. Thank you!",
    "My tummy says thank you 🥣",
    "Yum! Is there more? Just kidding.",
    "Licked the bowl clean ✨",
  ],
  water: [
    "Slurp! So refreshing 💧",
    "Cool, clear and delicious.",
    "Ahh, hydrated and happy.",
    "Splish splash, thanks!",
    "Water: 10/10 💦",
  ],
  walk: [
    "Sniffed EVERYTHING. 10/10.",
    "That was the best adventure!",
    "Fresh air and good vibes 🌿",
    "My legs are happy tired.",
    "Can we go again? Please? 🐾",
  ],
  litter: [
    "Fresh and clean. Chef's kiss.",
    "Ahh, so tidy in here ✨",
    "Spotless! Thank you.",
    "Much better. You're the best.",
    "Sparkly clean 🧼",
  ],
  groomed: [
    "So fluffy! Do I look fancy?",
    "Ooh, I feel brand new ✨",
    "Pampered and proud 💅",
    "Silky smooth, thank you!",
    "Look at this shine!",
  ],
  meds: [
    "All done. I was brave 💪",
    "Medicine: check! Treat please?",
    "Thanks for taking care of me 💛",
    "Feeling better already.",
    "Brave pet badge unlocked 🏅",
  ],
  vet: [
    "Vet visit done. I was so brave!",
    "Check-up complete. Treat time?",
    "Healthy and proud 💛",
    "Thanks for looking after me.",
    "That's one brave pet right here 🏅",
  ],
  weight: [
    "Weighed in! Looking good.",
    "Numbers noted. I feel great!",
    "Tracking me like a pro 📈",
    "Hop on the scale, done ✨",
    "Perfectly me-sized 🐾",
  ],
  health: [
    "Saved. Thanks for looking out for me 💛",
    "Health note filed away ✨",
    "You take such good care of me.",
    "All noted. I feel safe 🩺",
    "Got it! Stay healthy together.",
  ],
  note: [
    "Noted! You're so thoughtful 📝",
    "Saved in my diary ✨",
    "Good to remember that!",
    "I'll never forget it. Promise.",
    "Written down with love 💛",
  ],
};

const DOG_REACTIONS: Partial<Record<keyof typeof GENERIC_REACTIONS, Bank>> = {
  fed: ["Bowl: empty. Heart: full 🐶", "WOOF! Best breakfast ever 🐾", "Zoomies incoming after that!", "Nom nom, thank you human!", "Tail wags for you 🐕"],
  walk: ["Sniffed EVERYTHING. 10/10.", "Squirrel spotted. Heroically ignored.", "Best walk! Tail still wagging 🐕", "Puddles: jumped. Sticks: found.", "Again? Again? Again? 🐾"],
};

const CAT_REACTIONS: Partial<Record<keyof typeof GENERIC_REACTIONS, Bank>> = {
  fed: ["Purrfect. You may pet me now 🐱", "Crunchy! Best breakfast ever 🐾", "Nom. Acceptable. Great, actually.", "Meow-velous meal!", "Full belly, soft purr."],
  litter: ["Fresh sand, fresh mood 🐈", "Pristine. I approve.", "Clean box, happy cat ✨", "Thank you, servant. I mean friend!", "Purrfectly tidy."],
};

const MOOD_LINES: Record<MascotMood, Bank> = {
  happy: ["Life is good!", "Best. Day. Ever.", "You're my favourite human 💛", "Happy happy happy!", "I feel so loved 🐾"],
  content: ["Just vibing.", "Cozy and calm.", "Hi there! Nice to see you.", "All is well in my world.", "Happy you're here 🐾"],
  hungry: ["Tummy is rumbling a little…", "Is it snack o'clock?", "I smell dinner dreams 🥣", "A little nibble, maybe?", "My bowl misses you."],
  thirsty: ["A sip of water would be lovely 💧", "Feeling a bit dry…", "Fresh water, please?", "Glug glug dreams.", "My bowl could use a refill."],
  restless: ["Is it walk o'clock? 🦮", "I have so much energy!", "Leash? Leash? Leash?", "Fresh air sounds amazing.", "Wiggly paws over here 🐾"],
  sleepy: ["Zzz… sweet dreams 🌙", "Time for a cozy nap.", "Yaaawn. Goodnight!", "Curling up now…", "Sleepy paws, soft blanket 💤"],
  grumpy: ["Hmph. The box needs love.", "A little fresh litter would be nice.", "Not grumpy, just particular 😼", "Tiny pout. Big heart.", "Could we freshen things up?"],
};

const LETTERS: Bank = [
  "Dear human, whenever you're ready, I'd love a snack and a cuddle. — {name} 💌",
  "Dear human, no rush at all. I just like when you drop by. — {name} 💌",
  "Dear human, I saved your spot on the couch. — {name} 💌",
  "Dear human, I'm cozy and content. Say hi when you can! — {name} 💌",
];

function pick(bank: Bank, seed: number): string {
  return bank[Math.abs(Math.trunc(seed)) % bank.length];
}

const fill = (line: string, name: string) => line.replaceAll("{name}", name);

export function reactionLine(type: ReactionSource, species: Species, petName: string, seed: number): string {
  if (type === "tap") return moodLine("happy", species, petName, seed);
  const special = species === "dog" ? DOG_REACTIONS[type] : species === "cat" ? CAT_REACTIONS[type] : undefined;
  return fill(pick(special ?? GENERIC_REACTIONS[type], seed), petName);
}

const PLAYFUL: Bank = ["Wanna play? 🎾", "I have so much energy!", "Zoomies loading…", "Play with me, please?", "Wiggly paws over here 🐾"];

export function moodLine(mood: MascotMood, species: Species, petName: string, seed: number): string {
  const bank = mood === "restless" && species !== "dog" ? PLAYFUL : MOOD_LINES[mood];
  return fill(pick(bank, seed), petName);
}

export function letterLine(petName: string, seed: number): string {
  return fill(pick(LETTERS, seed), petName);
}
