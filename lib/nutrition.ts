import type { IconName } from "@/components/Icons";
import { weightFeedingEntry, type Pet } from "@/lib/data";

/**
 * Nutrition reference data + the maths behind the Care › Nutrition tab.
 *
 * Division of labour with the rest of lib/:
 *  - `CARE_PLANS` (data.ts) owns the *routine* — what the family does and how often.
 *  - `WEIGHT_FEEDING_GUIDES` (data.ts) owns the *quantity* — kcal and kibble grams
 *    per age stage and gender. This file never restates those numbers; it reads
 *    them through `dailyEnergy()` so one edit there moves every screen.
 *  - `BREED_FACTS` (breedFacts.ts) owns trivia and stays observational.
 *  - THIS file owns the *composition*: what the food should be made of for this
 *    breed, in what form it should arrive, what to keep off the plate, and what
 *    any of it costs.
 *
 * Editorial rules for everything below, because this is health content shown to
 * real owners:
 *  - Every breed claim traces to a documented, breed-associated condition
 *    (HCM in British Shorthairs, POMC satiety in Labradors, EPI and GDV in
 *    German Shepherds…), not to folklore. Where a breed has no special need, the
 *    entry says so rather than inventing one.
 *  - Nothing here diagnoses or prescribes. Copy points at the vet for anything
 *    that would be a treatment decision, and the home recipes carry a
 *    non-dismissible completeness warning (see `RECIPE_WARNING`).
 *  - Macro figures are percentages of DRY MATTER, the basis vets compare on —
 *    a wet food's "8% protein" on the tin is ~40% dry matter. `DRY_MATTER_NOTE`
 *    is surfaced in the UI so the number isn't quietly misread off a label.
 */

/* ── Types ─────────────────────────────────────────────────────────────────── */

/** The forms food arrives in. `mixed` is deliberately its own option: for several
 *  breeds the vet answer is "wet for the water, dry for the teeth and the bill". */
export type FormatId = "dry" | "wet" | "mixed" | "fresh" | "raw";

/** How well a format suits a breed. Ordered worst→best by `FIT_RANK`. */
export type Fit = "best" | "good" | "sometimes" | "avoid";

export type MacroKey = "protein" | "fat" | "fibre";

/** A target band as a percentage of dry matter. */
export interface MacroTarget {
  min: number;
  max: number;
}

/** A nutrient worth naming on the label, and the breed reason it matters. */
export interface NutrientNote {
  label: string;
  why: string;
  icon: IconName;
}

/** One line of the feed / limit / never lists. */
export interface IngredientRule {
  item: string;
  why: string;
}

export interface FormatFit {
  fit: Fit;
  note: string;
}

export interface BreedNutrition {
  /** The dietary thesis, 3–7 words. Set as the section's headline. */
  headline: string;
  /** Two or three sentences. `{name}` is replaced with the pet's name. */
  body: string;
  macros: Record<MacroKey, MacroTarget>;
  /** How the day's food should be split. MUST open with the meal count ("2", or
   *  a range like "2–3") — `mealCountLabel` reads it for the hub's glance strip. */
  mealPattern: string;
  /** Why that split, in one clause — bloat, satiety, blood sugar, jaw shape. */
  mealWhy: string;
  nutrients: NutrientNote[];
  formats: Partial<Record<FormatId, FormatFit>>;
  /** Breed-specific things to keep low. Species-wide toxins live in `NEVER_FEED`. */
  limit: IngredientRule[];
  /** Breed-specific things worth going out of your way for. */
  favour: IngredientRule[];
  /** Recipe ids that suit this breed, best first. */
  recipes: string[];
}

export interface Recipe {
  id: string;
  name: string;
  species: "cat" | "dog";
  /** One line: who this is for. */
  suits: string;
  /** Hands-on time. */
  minutes: number;
  /** Energy density of the FINISHED, cooked food. Home food runs 100–190 kcal
   *  per 100 g against kibble's ~350–400, which is why portions are computed
   *  from calories here and never carried over from a kibble gram figure. */
  kcalPer100g: number;
  /** Proportional recipe: grams of each ingredient per 1 kg of finished food.
   *  Scaled to the actual pet by `scaleRecipe`. */
  ingredients: { item: string; gramsPerKg: number; note?: string }[];
  steps: string[];
  /** The nutritional argument for the recipe. */
  why: string;
  tags: string[];
}

/* ── Constants surfaced in the UI ──────────────────────────────────────────── */

export const FORMAT_LABEL: Record<FormatId, string> = {
  dry: "Dry kibble",
  wet: "Wet / canned",
  mixed: "Mixed feeding",
  fresh: "Fresh cooked",
  raw: "Raw",
};

export const FORMAT_ICON: Record<FormatId, IconName> = {
  dry: "box",
  wet: "drop",
  mixed: "bowl",
  fresh: "leaf",
  raw: "bone",
};

/** Pill text. Short on purpose — it sits beside a format name on a 375pt
 *  screen, and the expanded note carries the reasoning. */
export const FIT_LABEL: Record<Fit, string> = {
  best: "Best",
  good: "Good",
  sometimes: "Sometimes",
  avoid: "Avoid",
};

/** The same rating spelled out, for screen readers and anywhere with room. */
export const FIT_MEANING: Record<Fit, string> = {
  best: "the best fit for this breed",
  good: "works well for this breed",
  sometimes: "occasionally, with care",
  avoid: "not suited to this breed",
};

/** Sort order for the format list — best first. */
export const FIT_RANK: Record<Fit, number> = { best: 0, good: 1, sometimes: 2, avoid: 3 };

export const MACRO_LABEL: Record<MacroKey, string> = {
  protein: "Protein",
  fat: "Fat",
  fibre: "Fibre",
};

/**
 * One shared ceiling for all three macro bars (% dry matter).
 *
 * Deliberately shared rather than a per-nutrient scale: giving fibre its own
 * 0–12% axis would draw a 4% band as long as a 25% protein band, and a reader
 * glancing at three stacked bars will compare their lengths whatever the small
 * print says. On a common axis the picture is the truth — protein dominates,
 * fibre is a sliver — and the exact figures sit beside each bar anyway.
 */
export const MACRO_AXIS_MAX = 60;

export const DRY_MATTER_NOTE =
  "Percentages are of dry matter — the basis vets compare on. A tin reading 8% protein is roughly 40% once its water is taken out, so wet and dry labels can't be read against each other directly.";

export const RECIPE_WARNING =
  "A home-cooked bowl is not a complete diet on its own. Meat, rice and vegetables miss calcium, taurine, zinc, iodine and several vitamins, and the gaps take months to show. Ask your vet for a formulated supplement to finish these recipes before they replace anything.";

/* ── Species-wide never-feed lists ─────────────────────────────────────────── */

/**
 * The safety list. Never gated, never collapsed by default, never abbreviated:
 * this is the part of the screen that has to be readable at a glance by someone
 * who is already worried.
 */
export const NEVER_FEED: Record<"cat" | "dog", IngredientRule[]> = {
  dog: [
    { item: "Xylitol / birch sugar", why: "In sugar-free gum, peanut butter and baking. Triggers a crash in blood sugar within minutes and liver failure within days. The single most dangerous item in most kitchens." },
    { item: "Grapes, raisins, sultanas", why: "Cause sudden kidney failure in some dogs. There is no known safe amount and no way to tell which dogs react." },
    { item: "Chocolate, coffee, energy drinks", why: "Theobromine and caffeine. Darker chocolate is worse — baking chocolate is dangerous in small squares." },
    { item: "Onion, garlic, leek, chives", why: "Destroy red blood cells, cooked or raw, fresh or powdered. Gravy, stock cubes and leftover curry all count." },
    { item: "Cooked bones", why: "Cooking makes bone splinter. Splinters perforate the gut. Raw bones are a different question — ask your vet before offering any." },
    { item: "Macadamia nuts", why: "Cause weakness, tremors and a staggering gait, usually within twelve hours." },
    { item: "Alcohol and raw yeast dough", why: "Dough rises in the stomach and ferments to alcohol there. Both hit small bodies hard." },
  ],
  cat: [
    { item: "Onion, garlic and anything cooked in them", why: "Cats are more sensitive to these than dogs. Baby food with onion powder is a common accidental source." },
    { item: "Lilies (any part, including pollen)", why: "Not food, but the most common fatal poisoning in cats. A brushed-past bouquet is enough. Keep them out of the house." },
    { item: "Dog food as a staple", why: "Dog food lacks taurine, arachidonic acid and preformed vitamin A. Cats cannot make these themselves; going without causes heart and eye disease." },
    { item: "Raw fish as a habit", why: "Thiaminase in raw fish destroys vitamin B1. Occasional cooked fish is fine, a raw fish diet is not." },
    { item: "Milk and cream", why: "Most adult cats lose the enzyme for lactose. It reads as a treat and lands as diarrhoea." },
    { item: "Paracetamol, aspirin, ibuprofen", why: "Cats cannot process paracetamol at all — a single tablet is lethal. Never give human painkillers, in food or otherwise." },
    { item: "Grapes, raisins, chocolate, xylitol", why: "The same list as dogs. Cats eat them less often, not more safely." },
  ],
};

/* ── Recipes ───────────────────────────────────────────────────────────────── */

export const RECIPES: Recipe[] = [
  {
    id: "beef-rice-carrot",
    name: "Beef, rice & carrot",
    species: "dog",
    suits: "Working breeds on a red-meat diet",
    minutes: 30,
    kcalPer100g: 152,
    ingredients: [
      { item: "Lean beef mince (10% fat)", gramsPerKg: 450, note: "Browned, fat drained" },
      { item: "White rice", gramsPerKg: 300, note: "Cooked weight" },
      { item: "Carrot", gramsPerKg: 130, note: "Diced, steamed soft" },
      { item: "Green beans", gramsPerKg: 90, note: "Chopped, steamed" },
      { item: "Sunflower or fish oil", gramsPerKg: 30 },
    ],
    steps: [
      "Brown the mince in a dry pan over medium heat until no pink remains, then drain the fat off.",
      "Stir the cooked rice through while the pan is still warm.",
      "Steam the carrot and beans until a fork goes through easily, then fold them in.",
      "Take the pan off the heat, let it cool, then stir the oil through so it isn't cooked.",
      "Add the supplement your vet formulated, portion into daily tubs and refrigerate up to three days.",
    ],
    why: "Beef carries the iron, zinc, creatine and B12 that a heavily muscled dog draws on, and white rice is the gentlest carbohydrate to sit alongside it. Oil goes in off the heat so the omega-3 survives.",
    tags: ["Red meat", "High protein", "Muscle"],
  },
  {
    id: "turkey-pumpkin-oat",
    name: "Turkey, pumpkin & oat",
    species: "dog",
    suits: "Sensitive stomachs and loose stools",
    minutes: 25,
    kcalPer100g: 128,
    ingredients: [
      { item: "Turkey mince", gramsPerKg: 430 },
      { item: "Porridge oats", gramsPerKg: 260, note: "Cooked weight" },
      { item: "Pumpkin purée", gramsPerKg: 200, note: "Plain, no spice" },
      { item: "Courgette", gramsPerKg: 80, note: "Grated, steamed" },
      { item: "Fish oil", gramsPerKg: 30 },
    ],
    steps: [
      "Cook the turkey through in a dry pan, breaking it up as it goes.",
      "Cook the oats in water until soft, keeping them loose rather than stiff.",
      "Stir the pumpkin and courgette through the warm oats.",
      "Fold the turkey in, cool the pan, then add the oil and your vet's supplement.",
      "Introduce over five days, swapping a fifth of the old food each day.",
    ],
    why: "Turkey is the leanest everyday protein and the least likely to provoke a reaction. Pumpkin's soluble fibre firms up loose stools and softens hard ones, which is why it appears in both directions.",
    tags: ["Gentle", "Lean", "Fibre"],
  },
  {
    id: "salmon-sweet-potato",
    name: "Salmon & sweet potato",
    species: "dog",
    suits: "Dull coats, itchy skin, stiff joints",
    minutes: 35,
    kcalPer100g: 146,
    ingredients: [
      { item: "Salmon fillet", gramsPerKg: 400, note: "Skinless, pin-boned, baked" },
      { item: "Sweet potato", gramsPerKg: 340, note: "Baked, skin off" },
      { item: "Spinach", gramsPerKg: 110, note: "Wilted" },
      { item: "Broccoli", gramsPerKg: 120, note: "Steamed, finely chopped" },
      { item: "Olive oil", gramsPerKg: 30 },
    ],
    steps: [
      "Bake the salmon at 180°C for about 15 minutes, until it flakes apart.",
      "Check every flake for bones by hand. Do this twice.",
      "Bake or boil the sweet potato until soft, then mash it.",
      "Wilt the spinach and steam the broccoli, chop both fine, and fold everything together.",
      "Cool, add oil and your vet's supplement, and refrigerate up to three days.",
    ],
    why: "Salmon carries EPA and DHA in the form the body actually uses, which is what shows up in coat shine and joint comfort. Sweet potato adds beta-carotene and a slower-releasing carbohydrate than white rice.",
    tags: ["Omega-3", "Coat", "Joints"],
  },
  {
    id: "chicken-green-bean",
    name: "Chicken & green bean bowl",
    species: "dog",
    suits: "Dogs on a diet who still act starving",
    minutes: 25,
    kcalPer100g: 104,
    ingredients: [
      { item: "Chicken breast", gramsPerKg: 420, note: "Poached, shredded" },
      { item: "Green beans", gramsPerKg: 280, note: "Steamed, chopped" },
      { item: "Courgette", gramsPerKg: 140, note: "Grated" },
      { item: "Brown rice", gramsPerKg: 130, note: "Cooked weight" },
      { item: "Fish oil", gramsPerKg: 30 },
    ],
    steps: [
      "Poach the chicken in plain water until cooked through, then shred it.",
      "Steam the beans and courgette until soft but not collapsing.",
      "Stir the rice through, then the chicken.",
      "Cool, add oil and your vet's supplement.",
      "Serve in a slow-feeder bowl — this recipe is built around bulk, and bulk only helps if it's eaten slowly.",
    ],
    why: "The lowest-calorie bowl here by some distance. Beans and courgette fill the stomach at almost no caloric cost, which is the only honest answer for a dog whose appetite ignores how much it has eaten.",
    tags: ["Low calorie", "Satiety", "Weight loss"],
  },
  {
    id: "chicken-liver-cat",
    name: "Chicken thigh & liver",
    species: "cat",
    suits: "The everyday cat bowl",
    minutes: 30,
    kcalPer100g: 168,
    ingredients: [
      { item: "Chicken thigh", gramsPerKg: 700, note: "Boneless, skin on, poached" },
      { item: "Chicken liver", gramsPerKg: 90, note: "Poached — no more than this" },
      { item: "Chicken heart", gramsPerKg: 90, note: "The natural taurine source" },
      { item: "Egg yolk", gramsPerKg: 50, note: "Lightly cooked" },
      { item: "Water from the pan", gramsPerKg: 70 },
    ],
    steps: [
      "Poach the thigh, liver and heart in plain water until cooked through. Keep the water.",
      "Blend or mince to a coarse pâté — most cats reject a smooth purée.",
      "Stir the lightly cooked yolk and enough pan water through to loosen it.",
      "Add your vet's feline supplement. Taurine is not optional in a home-cooked cat diet.",
      "Portion into daily tubs. Refrigerate two days, freeze the rest.",
    ],
    why: "Cats are obligate carnivores: they cannot make taurine, arachidonic acid or vitamin A from plants. Heart is the richest natural taurine there is, and liver covers vitamin A — but liver above roughly 10% tips into vitamin A toxicity, so the amount here is a ceiling, not a suggestion.",
    tags: ["Obligate carnivore", "Taurine", "High protein"],
  },
  {
    id: "salmon-egg-cat",
    name: "Salmon & egg pâté",
    species: "cat",
    suits: "Dry coats and flaky skin",
    minutes: 25,
    kcalPer100g: 158,
    ingredients: [
      { item: "Salmon fillet", gramsPerKg: 620, note: "Cooked, checked twice for bones" },
      { item: "Chicken heart", gramsPerKg: 130, note: "Poached" },
      { item: "Egg", gramsPerKg: 120, note: "Scrambled dry" },
      { item: "Pumpkin purée", gramsPerKg: 60, note: "Plain" },
      { item: "Water", gramsPerKg: 70 },
    ],
    steps: [
      "Bake the salmon until it flakes, then go through it by hand for bones.",
      "Poach the hearts and scramble the egg without oil or seasoning.",
      "Blend to a coarse pâté with the pumpkin and water.",
      "Add your vet's feline supplement and portion out.",
      "Cooked only — raw fish destroys vitamin B1.",
    ],
    why: "Salmon's EPA and DHA are what show up in a coat within about six weeks. The hearts are here to hold taurine up, because fish alone doesn't carry enough of it for a cat.",
    tags: ["Omega-3", "Coat", "Taurine"],
  },
  {
    id: "turkey-hairball-cat",
    name: "Turkey & pumpkin hairball blend",
    species: "cat",
    suits: "Long coats and frequent hairballs",
    minutes: 25,
    kcalPer100g: 144,
    ingredients: [
      { item: "Turkey thigh", gramsPerKg: 650, note: "Poached, boneless" },
      { item: "Chicken heart", gramsPerKg: 120 },
      { item: "Pumpkin purée", gramsPerKg: 130, note: "The fibre that moves hair through" },
      { item: "Egg yolk", gramsPerKg: 40 },
      { item: "Water from the pan", gramsPerKg: 60 },
    ],
    steps: [
      "Poach the turkey and hearts until cooked through.",
      "Mince coarsely rather than blending smooth.",
      "Stir the pumpkin, yolk and pan water through.",
      "Add your vet's feline supplement.",
      "Pair it with daily brushing — food moves swallowed hair along, it doesn't stop the swallowing.",
    ],
    why: "Hairballs are a transit problem, not a stomach one. Pumpkin's fibre carries swallowed hair through the gut instead of letting it pack down, and the moisture in a home-cooked bowl helps it along.",
    tags: ["Fibre", "Long coat", "Hairballs"],
  },
];

/* ── Breed profiles ────────────────────────────────────────────────────────── */

const CAT_DEFAULT: BreedNutrition = {
  headline: "Meat first, water always",
  body: "Cats are obligate carnivores — protein and animal fat are the whole diet, and carbohydrate is filler. {name} also evolved from a desert animal with a weak thirst drive, so most of the day's water has to arrive inside the food.",
  macros: { protein: { min: 40, max: 50 }, fat: { min: 18, max: 24 }, fibre: { min: 2, max: 4 } },
  mealPattern: "3–4 small meals, or a measured portion left out",
  mealWhy: "A cat's natural pattern is many small kills a day, not two sittings.",
  nutrients: [
    { label: "Taurine", why: "Cats cannot make it. Going without causes heart and retinal disease.", icon: "heart-text" },
    { label: "Animal protein", why: "Plant protein doesn't carry the amino acids a cat needs, however high the percentage reads.", icon: "bone" },
    { label: "Moisture", why: "Cats on dry food alone drink far less than they need. Urinary and kidney trouble follows.", icon: "drop" },
  ],
  formats: {
    wet: { fit: "best", note: "Roughly 75% water. The simplest way to get a cat properly hydrated." },
    mixed: { fit: "good", note: "Wet for the water, a measured dry portion for grazing and the bill." },
    dry: { fit: "sometimes", note: "Convenient and cheaper, but pair it with a fountain and watch the water bowl." },
    fresh: { fit: "good", note: "Only with a vet-formulated supplement — taurine gaps are invisible until they aren't." },
    raw: { fit: "sometimes", note: "Real bacterial risk to the cat and to the household. Vet-supervised only." },
  },
  limit: [
    { item: "Carbohydrate filler", why: "Corn and wheat high in the ingredient list means less of the meat a cat actually runs on." },
    { item: "Free-fed dry food", why: "A bowl that's always full is how most indoor cats end up overweight." },
  ],
  favour: [
    { item: "Named single proteins", why: "\"Chicken\" tells you what's in the tin. \"Meat derivatives\" doesn't." },
    { item: "Omega-3 from fish", why: "Coat, skin and joint comfort, and it helps inflammatory conditions." },
  ],
  recipes: ["chicken-liver-cat", "salmon-egg-cat", "turkey-hairball-cat"],
};

const DOG_DEFAULT: BreedNutrition = {
  headline: "Measured portions, real protein",
  body: "Dogs handle a broader diet than cats, but the two things that decide a dog's long-term health are portion size and protein quality. Keeping {name} lean is the single best-evidenced way to add years.",
  macros: { protein: { min: 22, max: 30 }, fat: { min: 12, max: 18 }, fibre: { min: 3, max: 5 } },
  mealPattern: "2 measured meals a day",
  mealWhy: "Two sittings keep blood sugar and hunger steadier than one large bowl.",
  nutrients: [
    { label: "Named animal protein", why: "First on the ingredient list, and named — \"chicken\", not \"meat meal\".", icon: "bone" },
    { label: "Omega-3", why: "Skin, coat and joint comfort, with real evidence behind it.", icon: "fish" },
    { label: "Fibre", why: "Keeps stools formed and helps a food-focused dog feel full.", icon: "leaf" },
  ],
  formats: {
    dry: { fit: "best", note: "Complete, measurable and the easiest to portion accurately." },
    mixed: { fit: "good", note: "A dry base with wet stirred through for palatability and water." },
    wet: { fit: "good", note: "More appealing and more hydrating, more expensive per calorie." },
    fresh: { fit: "good", note: "Excellent with a vet-formulated supplement to complete it." },
    raw: { fit: "sometimes", note: "Bacterial risk to the dog and to everyone handling the bowl. Vet-supervised only." },
  },
  limit: [
    { item: "Table scraps", why: "They wreck portion accuracy and are usually the reason a dog gains weight." },
    { item: "Free-feeding", why: "A bowl left down all day makes it impossible to notice when a dog goes off its food — often the first sign of illness." },
  ],
  favour: [
    { item: "Weighed portions", why: "Scales, not scoops. A heaped cup can be 40% more than a level one." },
    { item: "Slow transitions", why: "Swap a fifth of the old food each day over five days to avoid an upset gut." },
  ],
  recipes: ["turkey-pumpkin-oat", "beef-rice-carrot", "chicken-green-bean"],
};

export const BREED_NUTRITION: Record<string, BreedNutrition> = {
  /* ── Cats ────────────────────────────────────────────────────────────────── */
  "British Shorthair": {
    headline: "Lean, hydrated, heart-aware",
    body: "This breed is built like a brick and behaves like a cushion, so calories land as weight faster than in almost any other cat. It also carries the highest-profile inherited risk in the pedigree cat world — hypertrophic cardiomyopathy — which is why {name}'s bowl is planned around heart and kidney health rather than just around size.",
    macros: { protein: { min: 40, max: 50 }, fat: { min: 15, max: 20 }, fibre: { min: 3, max: 5 } },
    mealPattern: "2 weighed meals, nothing left down between",
    mealWhy: "A British Shorthair will eat whatever is in front of it, all day, and gain on it.",
    nutrients: [
      { label: "Taurine", why: "Directly supports heart muscle — the tissue this breed's HCM risk affects.", icon: "heart-text" },
      { label: "Omega-3 (EPA/DHA)", why: "Anti-inflammatory support for heart and joints in a heavy-framed cat.", icon: "fish" },
      { label: "L-carnitine", why: "Helps the body burn fat rather than store it, which matters in a breed this sedentary.", icon: "flame" },
      { label: "Moisture", why: "Polycystic kidney disease runs in the breed. Hydration is the cheapest protection there is.", icon: "drop" },
    ],
    formats: {
      wet: { fit: "best", note: "Water arrives with the food, which protects the kidneys and the bladder. Portion control is easier per tin, too." },
      mixed: { fit: "good", note: "Wet as the base, a weighed dry portion for grazing and dental abrasion." },
      dry: { fit: "sometimes", note: "Fine as part of the day, poor as all of it. If dry is the whole diet, add a fountain and check the water is actually going down." },
      fresh: { fit: "good", note: "Works well and hydrates well, but only finished with a vet-formulated supplement." },
      raw: { fit: "sometimes", note: "No breed-specific benefit, and a real bacterial risk. Vet-supervised only." },
    },
    limit: [
      { item: "Added salt", why: "Not a sensitivity in a healthy cat — but once heart disease is on the table, sodium restriction becomes part of the treatment. In a breed with this HCM risk, staying on moderate-sodium food from the start means nothing has to change later. Salty human food is off the list either way." },
      { item: "Treats between meals", why: "Ten kibbles a day is roughly a tenth of this cat's daily allowance." },
      { item: "Free-fed dry", why: "The fastest route to an overweight British Shorthair, and obesity puts direct load on a heart already at risk." },
    ],
    favour: [
      { item: "Weighed portions", why: "This breed's healthy weight range is wide (4–8 kg). Guessing does not work; a kitchen scale does." },
      { item: "Puzzle feeders", why: "Slows the meal and gets a famously lazy cat to move for its food." },
    ],
    recipes: ["chicken-liver-cat", "turkey-hairball-cat", "salmon-egg-cat"],
  },
  Persian: {
    headline: "A flat face changes the bowl",
    body: "A Persian's jaw is short and its palate is pushed up, so it physically struggles to pick up ordinary round kibble — many end up scooping food with the underside of the tongue. That coat also means {name} swallows a lot of hair, and polycystic kidney disease is common enough in the breed that hydration is a genuine health measure.",
    macros: { protein: { min: 38, max: 48 }, fat: { min: 16, max: 22 }, fibre: { min: 4, max: 7 } },
    mealPattern: "3 small meals in a wide, shallow bowl",
    mealWhy: "A deep bowl presses on the whiskers and the face; a flat plate is easier to work with.",
    nutrients: [
      { label: "Fibre", why: "Moves swallowed hair through the gut instead of letting it pack into a hairball.", icon: "leaf" },
      { label: "Moisture", why: "PKD runs in this breed. Water intake is the one thing an owner can influence daily.", icon: "drop" },
      { label: "Omega-3 and -6", why: "Keeps a long coat from matting and reduces the amount of it that gets swallowed.", icon: "fish" },
      { label: "Taurine", why: "HCM appears in Persians too. Non-negotiable in any cat diet.", icon: "heart-text" },
    ],
    formats: {
      wet: { fit: "best", note: "No pick-up problem at all, and it solves the water question at the same time." },
      mixed: { fit: "good", note: "Wet base plus an almond- or wedge-shaped kibble made for brachycephalic cats." },
      dry: { fit: "sometimes", note: "Only with kibble shaped for a flat face. Standard round kibble genuinely defeats some Persians." },
      fresh: { fit: "good", note: "A coarse pâté texture suits this jaw better than anything that needs crunching." },
      raw: { fit: "avoid", note: "Chunks and bone are the wrong texture for this jaw, on top of the usual bacterial risk." },
    },
    limit: [
      { item: "Round, hard kibble", why: "The shape this breed is worst at picking up. Watch a Persian eat it and you'll see the effort." },
      { item: "Deep, narrow bowls", why: "Whisker and face pressure. Cats eat less from them and it reads as fussiness." },
      { item: "Dyed food and treats", why: "Won't help the tear staining this breed is prone to, and may add to it." },
    ],
    favour: [
      { item: "Flat, wide plates", why: "Nothing touches the face or the whiskers." },
      { item: "Daily brushing alongside meals", why: "Hair removed by a brush is hair that never has to pass through the gut." },
    ],
    recipes: ["turkey-hairball-cat", "chicken-liver-cat", "salmon-egg-cat"],
  },
  "Maine Coon": {
    headline: "A big cat, growing slowly",
    body: "Maine Coons keep growing until three or four, far longer than other cats, so {name} stays on growth-stage nutrition well past the age when most cats switch to adult food. The breed also carries documented hip dysplasia and HCM risk — unusual in a cat, and both worth feeding for.",
    macros: { protein: { min: 42, max: 52 }, fat: { min: 18, max: 24 }, fibre: { min: 3, max: 5 } },
    mealPattern: "3 meals while growing, 2–3 as an adult",
    mealWhy: "A frame this size needs the day's calories spread out rather than delivered in two hits.",
    nutrients: [
      { label: "Taurine", why: "HCM is the breed's best-documented inherited condition. Taurine supports the same muscle.", icon: "heart-text" },
      { label: "Glucosamine and chondroitin", why: "Hip dysplasia is genuinely present in Maine Coons — rare enough in cats to be worth naming.", icon: "shield" },
      { label: "Calories that keep pace", why: "Under-feeding a cat that grows for three years costs it frame and muscle it won't get back.", icon: "flame" },
      { label: "Fibre", why: "A long, dense coat means a lot of swallowed hair.", icon: "leaf" },
    ],
    formats: {
      mixed: { fit: "best", note: "Wet for water and joints, dry for the sheer volume of calories a cat this size needs." },
      wet: { fit: "good", note: "Ideal nutritionally; the quantity gets expensive at 7–11 kg of cat." },
      dry: { fit: "good", note: "Practical for the calorie load — pair it with a fountain, cats this size drink more." },
      fresh: { fit: "good", note: "Suits the breed well when finished with a vet supplement." },
      raw: { fit: "sometimes", note: "Popular in the breed, still a bacterial risk. Vet-supervised only." },
    },
    limit: [
      { item: "Early switch to adult food", why: "Switching at twelve months, as you would for other cats, cuts growth nutrition off two years early." },
      { item: "Excess weight", why: "Every extra kilo lands on hips that already carry a dysplasia risk." },
    ],
    favour: [
      { item: "Large-breed portions, measured", why: "Big does not mean unlimited. Feed to the frame, not to the appetite." },
      { item: "Raised, wide bowls", why: "Less strain on the neck and shoulders of a very long cat." },
    ],
    recipes: ["chicken-liver-cat", "salmon-egg-cat", "turkey-hairball-cat"],
  },
  Siamese: {
    headline: "High metabolism, delicate liver",
    body: "Siamese are lean, loud and busy, and they burn through calories at a rate that leaves some of them genuinely underweight. The breed also carries a real risk of hepatic and renal amyloidosis — protein deposits in the liver and kidneys — so {name} is one of the few cats where organ-aware feeding is a breed matter and not just an age one.",
    macros: { protein: { min: 40, max: 50 }, fat: { min: 18, max: 26 }, fibre: { min: 2, max: 4 } },
    mealPattern: "4 small meals, or measured grazing",
    mealWhy: "A fast metabolism on an empty stomach turns into a very vocal cat.",
    nutrients: [
      { label: "Highly digestible protein", why: "Amyloidosis risk makes the *quality* of protein matter more than the quantity — easy-to-process animal protein, not plant filler.", icon: "bone" },
      { label: "Energy density", why: "This breed struggles to keep weight on. Calories per bite matter.", icon: "flame" },
      { label: "Moisture", why: "Kidney involvement is part of the amyloidosis picture. Water is protective.", icon: "drop" },
      { label: "Dental support", why: "Siamese get gingivitis and periodontal disease earlier than most cats.", icon: "sparkles" },
    ],
    formats: {
      wet: { fit: "best", note: "Hydration for the kidneys, and easier to make calorie-dense without filler." },
      mixed: { fit: "good", note: "Wet for water, a dental-shaped dry portion for the teeth." },
      dry: { fit: "sometimes", note: "Workable, but this is a breed where low water intake has somewhere to go wrong." },
      fresh: { fit: "good", note: "Very digestible, and easy to keep protein high-quality. Vet supplement required." },
      raw: { fit: "sometimes", note: "No breed-specific advantage over cooked fresh food. Vet-supervised only." },
    },
    limit: [
      { item: "Low-quality protein filler", why: "Not a reason to cut protein — a reason to insist on protein the liver processes cleanly." },
      { item: "Long gaps between meals", why: "A lean cat with a fast metabolism has very little reserve to draw on." },
    ],
    favour: [
      { item: "Regular weight checks", why: "Weight loss is often the first visible sign of amyloidosis. Monthly weigh-ins catch it early." },
      { item: "Interactive feeders", why: "Feeds the mind of a breed that gets destructive when bored." },
    ],
    recipes: ["chicken-liver-cat", "salmon-egg-cat", "turkey-hairball-cat"],
  },
  Ragdoll: {
    headline: "Placid, heavy, easily overfed",
    body: "Ragdolls are large, slow to mature and famously undemanding, which is a combination that quietly puts weight on. HCM is well documented in the breed and urinary tract problems are common, so {name}'s two priorities are staying lean and drinking enough.",
    macros: { protein: { min: 40, max: 50 }, fat: { min: 16, max: 22 }, fibre: { min: 3, max: 5 } },
    mealPattern: "2–3 weighed meals",
    mealWhy: "A cat this relaxed will not burn off a generous bowl.",
    nutrients: [
      { label: "Taurine", why: "HCM is the breed's headline inherited risk.", icon: "heart-text" },
      { label: "Moisture", why: "FLUTD and cystitis show up often in Ragdolls. Dilute urine is the best defence.", icon: "drop" },
      { label: "Controlled magnesium and phosphorus", why: "Keeps urinary crystals from forming in a breed already prone to them.", icon: "shield" },
      { label: "Fibre", why: "A long, silky coat means swallowed hair.", icon: "leaf" },
    ],
    formats: {
      wet: { fit: "best", note: "The single most effective thing you can do for a urinary-prone cat." },
      mixed: { fit: "good", note: "Wet-led, with a small measured dry portion." },
      dry: { fit: "sometimes", note: "Only alongside a fountain, and only if you can see the water going down." },
      fresh: { fit: "good", note: "High moisture and easy to keep lean, with a vet supplement." },
      raw: { fit: "sometimes", note: "No breed-specific benefit. Vet-supervised only." },
    },
    limit: [
      { item: "Grazing on dry food", why: "Low water plus a placid cat is exactly the urinary profile you don't want." },
      { item: "Growth food past two", why: "Slow maturity is not an excuse to keep the calories up indefinitely." },
    ],
    favour: [
      { item: "Water fountains", why: "Ragdolls drink noticeably more from moving water than from a still bowl." },
      { item: "Monthly weigh-ins", why: "A long-coated cat can gain a kilo before it's visible." },
    ],
    recipes: ["chicken-liver-cat", "turkey-hairball-cat", "salmon-egg-cat"],
  },
  Bengal: {
    headline: "Wildest appetite in the room",
    body: "Bengals are the most active domestic cat there is, with a short gut inherited from the Asian leopard cat and very little tolerance for carbohydrate. {name} does best on the highest-protein, lowest-filler food you can find — and if there's a sensitive stomach in the picture, filler is usually the reason.",
    macros: { protein: { min: 45, max: 55 }, fat: { min: 18, max: 25 }, fibre: { min: 2, max: 4 } },
    mealPattern: "3–4 meals, ideally worked for",
    mealWhy: "A hunting-drive cat that gets food for free redirects that drive at the furniture.",
    nutrients: [
      { label: "High animal protein", why: "The breed's short gut is built for meat and handles plant bulk poorly.", icon: "bone" },
      { label: "Taurine", why: "Progressive retinal atrophy appears in Bengals; taurine protects the retina.", icon: "eye" },
      { label: "Probiotics", why: "IBD and chronic loose stools are common in the breed.", icon: "shield" },
      { label: "Omega-3", why: "Anti-inflammatory support for a gut that flares.", icon: "fish" },
    ],
    formats: {
      wet: { fit: "best", note: "Highest protein, lowest carbohydrate, most water. Everything this breed wants." },
      fresh: { fit: "good", note: "Suits Bengals particularly well — as close to the natural diet as you can get safely. Vet supplement required." },
      mixed: { fit: "good", note: "Wet-led with a grain-free dry portion in a puzzle feeder." },
      dry: { fit: "sometimes", note: "Hard to find dry food low enough in carbohydrate for a Bengal gut." },
      raw: { fit: "sometimes", note: "Common in the breed and closest to the ancestral diet, but the bacterial risk is real and shared with the household. Vet-supervised only." },
    },
    limit: [
      { item: "Grain and potato filler", why: "The most likely trigger behind a Bengal's loose stools." },
      { item: "Sudden food changes", why: "This gut punishes abrupt swaps harder than most. Five days minimum." },
      { item: "Free food with no effort", why: "An unstimulated Bengal is a destructive Bengal." },
    ],
    favour: [
      { item: "Puzzle and hunting feeders", why: "Turns dinner into the activity the breed is desperate for." },
      { item: "Single novel proteins", why: "Makes it possible to identify what a sensitive gut is reacting to." },
    ],
    recipes: ["chicken-liver-cat", "salmon-egg-cat", "turkey-hairball-cat"],
  },
  "Scottish Fold": {
    headline: "Every gram lands on the joints",
    body: "The gene that folds a Scottish Fold's ears affects cartilage everywhere in the body, so some degree of osteochondrodysplasia is present in every cat of this breed. That single fact drives the whole diet: {name} must stay lean, because there is no joint here with room to spare.",
    macros: { protein: { min: 40, max: 50 }, fat: { min: 15, max: 20 }, fibre: { min: 3, max: 5 } },
    mealPattern: "2–3 weighed meals",
    mealWhy: "Weight control is not cosmetic in this breed. It's pain management.",
    nutrients: [
      { label: "Glucosamine and chondroitin", why: "Cartilage support in a breed with a known cartilage defect.", icon: "shield" },
      { label: "Omega-3 (EPA/DHA)", why: "The best-evidenced dietary anti-inflammatory for joint pain.", icon: "fish" },
      { label: "Lean body weight", why: "Every 100 g off a Scottish Fold is load off joints that are already compromised.", icon: "scale" },
      { label: "Taurine", why: "HCM and PKD both appear in the breed alongside the joint issue.", icon: "heart-text" },
    ],
    formats: {
      wet: { fit: "best", note: "Easiest to keep calories low without leaving the cat hungry, and it hydrates." },
      mixed: { fit: "good", note: "Wet-led with a small dry portion in a low, easy-access bowl." },
      dry: { fit: "sometimes", note: "Calorie-dense per mouthful — the hardest format to keep a lean cat lean on." },
      fresh: { fit: "good", note: "Precise portion control and high moisture, with a vet supplement." },
      raw: { fit: "avoid", note: "No joint benefit, and hard chunks are awkward for a cat that may not sit comfortably." },
    },
    limit: [
      { item: "Any excess weight at all", why: "The single most important line on this page for this breed." },
      { item: "High jumps to the food bowl", why: "Not a food, but a feeding decision. Put the bowl where it doesn't need a jump." },
    ],
    favour: [
      { item: "Ground-level, wide bowls", why: "No jumping, no crouching, no strain on sore joints." },
      { item: "Monthly weigh-ins", why: "Catching 200 g early is far easier than losing it later." },
    ],
    recipes: ["chicken-liver-cat", "salmon-egg-cat", "turkey-hairball-cat"],
  },
  "Stray Cat": {
    headline: "Rebuild slowly, then hold steady",
    body: "A cat with an unknown history needs a cautious start: a gut used to scavenging reacts badly to a sudden switch to rich food, and refeeding a thin cat too fast is genuinely dangerous. Once {name} is settled and the vet has ruled out parasites, an ordinary high-protein adult diet is exactly right.",
    macros: { protein: { min: 40, max: 50 }, fat: { min: 18, max: 24 }, fibre: { min: 2, max: 4 } },
    mealPattern: "4 small meals at first, 2–3 once settled",
    mealWhy: "Small and frequent is how you rebuild a stomach that has been running on scraps.",
    nutrients: [
      { label: "Highly digestible protein", why: "A gut that hasn't seen consistent food needs the easiest possible version of it.", icon: "bone" },
      { label: "Probiotics", why: "Rebuilds gut flora after scavenging, stress and often a course of deworming.", icon: "shield" },
      { label: "Taurine", why: "The first thing an inconsistent diet runs short of.", icon: "heart-text" },
      { label: "Moisture", why: "Many strays arrive dehydrated, and wet food is the gentlest way to fix that.", icon: "drop" },
    ],
    formats: {
      wet: { fit: "best", note: "Gentle, hydrating and hard to refuse — which matters with a cat that may not trust the bowl yet." },
      mixed: { fit: "good", note: "Wet-led, adding dry once the gut has settled." },
      dry: { fit: "sometimes", note: "Fine long-term, but a poor first food for an unsettled stomach." },
      fresh: { fit: "good", note: "Very digestible, with a vet supplement." },
      raw: { fit: "avoid", note: "An immune system under strain and an unknown parasite history are the worst case for raw." },
    },
    limit: [
      { item: "Rapid refeeding", why: "Refeeding syndrome is real. A very thin cat needs a vet-set plan, not a full bowl." },
      { item: "Rich food on day one", why: "The quickest way to a mess on the floor and a cat that distrusts the bowl." },
    ],
    favour: [
      { item: "A vet visit before anything else", why: "Parasites, fleas and dental pain all change what and how this cat should eat." },
      { item: "A predictable routine", why: "Same place, same times. Food security is most of what settles a stray." },
    ],
    recipes: ["chicken-liver-cat", "turkey-hairball-cat", "salmon-egg-cat"],
  },

  /* ── Dogs ────────────────────────────────────────────────────────────────── */
  "German Shepherd": {
    headline: "Red meat, joints, and a deep chest",
    body: "German Shepherds are heavily muscled working dogs and they genuinely do well on beef and lamb — the iron, zinc and B12 in red meat support the muscle mass this breed carries. But two breed problems shape {name}'s bowl more than the protein does: a deep chest that makes bloat a life-threatening risk, and exocrine pancreatic insufficiency, the digestive disease this breed is more prone to than any other.",
    macros: { protein: { min: 25, max: 30 }, fat: { min: 12, max: 16 }, fibre: { min: 3, max: 5 } },
    mealPattern: "2–3 smaller meals, never one large one",
    mealWhy: "Deep-chested breeds bloat and torsion on big meals. Split the day and leave an hour either side clear of hard exercise.",
    nutrients: [
      { label: "Red meat protein", why: "Beef and lamb carry the iron, zinc, creatine and B12 that this much muscle draws on.", icon: "bone" },
      { label: "Glucosamine and chondroitin", why: "Hip and elbow dysplasia are the breed's defining orthopaedic problems.", icon: "shield" },
      { label: "Omega-3 (EPA/DHA)", why: "Joint inflammation, coat, and support for a gut that is often sensitive.", icon: "fish" },
      { label: "Highly digestible fat", why: "EPI means the pancreas may not release the enzymes to break fat down. Digestibility beats quantity.", icon: "flame" },
    ],
    formats: {
      dry: { fit: "best", note: "Large-breed formulas are built for this frame, and dry food is the easiest to weigh accurately. Use a slow-feeder bowl." },
      mixed: { fit: "good", note: "A dry base with wet or fresh stirred through — helps a fussy or sensitive Shepherd finish the bowl." },
      fresh: { fit: "good", note: "Very digestible, which suits a breed prone to EPI. Needs a vet-formulated supplement to be complete." },
      wet: { fit: "good", note: "Palatable and hydrating, but expensive to feed a 35 kg dog on alone." },
      raw: { fit: "sometimes", note: "Popular in working lines, but bacterial risk is real and a compromised pancreas handles it no better. Vet-supervised only." },
    },
    limit: [
      { item: "One big daily meal", why: "The clearest modifiable bloat risk factor there is for this chest shape." },
      { item: "Exercise around mealtimes", why: "Leave an hour either side. A hard run on a full stomach is how torsion happens." },
      { item: "Excess calcium in puppies", why: "Over-supplementing a large-breed puppy makes bones grow faster than joints can support. Large-breed puppy food already has this balanced — don't add to it." },
      { item: "Very high fat", why: "If EPI is in the picture, fat is the macronutrient the pancreas struggles with most." },
    ],
    favour: [
      { item: "Slow-feeder bowls", why: "Gulped air is part of the bloat picture, and Shepherds eat fast." },
      { item: "Raised bowls only if your vet says so", why: "The evidence on raised bowls and bloat is genuinely mixed. Ask rather than assume." },
      { item: "Digestive enzymes if prescribed", why: "EPI is manageable with enzyme replacement — but that is a vet diagnosis, not a supplement guess." },
    ],
    recipes: ["beef-rice-carrot", "turkey-pumpkin-oat", "salmon-sweet-potato"],
  },
  "Labrador Retriever": {
    headline: "Genuinely never feels full",
    body: "Around a quarter of Labradors carry a deletion in the POMC gene that blunts the signal telling the brain the stomach is full. {name} is not being greedy — the off-switch is missing. That makes measured portions and bulky, filling food the single most important thing on this page, because this breed is the most obesity-prone dog there is.",
    macros: { protein: { min: 25, max: 30 }, fat: { min: 10, max: 14 }, fibre: { min: 4, max: 8 } },
    mealPattern: "2 weighed meals, in a slow feeder",
    mealWhy: "A Labrador can empty a bowl in twenty seconds and be looking for more.",
    nutrients: [
      { label: "Fibre", why: "Bulk without calories is the only honest answer to an appetite that doesn't switch off.", icon: "leaf" },
      { label: "Lean protein", why: "Holds muscle while calories come down, so weight loss doesn't cost strength.", icon: "bone" },
      { label: "Glucosamine and chondroitin", why: "Hip and elbow dysplasia are common, and every extra kilo makes them worse.", icon: "shield" },
      { label: "L-carnitine", why: "Supports fat metabolism during weight loss.", icon: "flame" },
    ],
    formats: {
      dry: { fit: "best", note: "Easiest to weigh precisely, and high-fibre satiety formulas exist specifically for this problem." },
      mixed: { fit: "good", note: "Bulking a measured dry portion with wet or steamed vegetables makes it look like more food." },
      fresh: { fit: "good", note: "Vegetable-heavy fresh food fills the stomach at low cost. Vet supplement required." },
      wet: { fit: "sometimes", note: "Very palatable, which is not the help it sounds like for this breed." },
      raw: { fit: "sometimes", note: "No advantage for the breed's central problem. Vet-supervised only." },
    },
    limit: [
      { item: "Free-feeding", why: "A full bowl left down is not survivable for a Labrador's waistline." },
      { item: "Table scraps and training treats", why: "Count them into the daily total or subtract them from dinner. Both, ideally." },
      { item: "Calorie-dense dry food", why: "A performance formula in a pet Labrador is a lot of calories in a small scoop." },
    ],
    favour: [
      { item: "Kitchen scales", why: "A heaped cup can be 40% more than a level one. Grams don't have that problem." },
      { item: "Green beans and courgette as bulk", why: "Nearly free calorically, and they make a diet portion look like a real meal." },
      { item: "Slow feeders and snuffle mats", why: "Stretches a two-minute meal into fifteen, which is where fullness actually registers." },
    ],
    recipes: ["chicken-green-bean", "turkey-pumpkin-oat", "salmon-sweet-potato"],
  },
  "French Bulldog": {
    headline: "Allergies, air, and a flat face",
    body: "Frenchies are the most allergy-prone popular breed — itchy skin and recurring ear trouble usually start with food or environment, not fleas. The flat face means {name} swallows air with every mouthful, which is where the breed's famous wind comes from, and every extra kilo makes an already-compromised airway work harder.",
    macros: { protein: { min: 22, max: 28 }, fat: { min: 10, max: 15 }, fibre: { min: 3, max: 5 } },
    mealPattern: "2 small meals, slow feeder, upright and calm",
    mealWhy: "Gulping is the problem. Everything about the meal should slow it down.",
    nutrients: [
      { label: "Novel single protein", why: "Duck, fish or venison — proteins the dog hasn't met before are the standard route through a food allergy.", icon: "fish" },
      { label: "Omega-3", why: "The best-evidenced dietary support for the itchy, inflamed skin this breed lives with.", icon: "leaf" },
      { label: "Probiotics", why: "Gut health and skin allergies are closely linked in Frenchies.", icon: "shield" },
      { label: "Lean body weight", why: "Fat around the neck and chest directly narrows an airway that is already too small.", icon: "scale" },
    ],
    formats: {
      dry: { fit: "good", note: "Only in a brachycephalic-shaped kibble the dog can actually pick up. Limited-ingredient formulas are the ones to look at." },
      fresh: { fit: "best", note: "Easiest format for controlling exactly which proteins go in, which is the whole game with an allergic Frenchie. Vet supplement required." },
      wet: { fit: "good", note: "No pick-up problem, and single-protein tins are easy to find." },
      mixed: { fit: "good", note: "Fine, as long as every component stays inside the elimination diet." },
      raw: { fit: "sometimes", note: "Sometimes recommended for allergies, but the bacterial risk lands on a breed that already has a lot going on. Vet-supervised only." },
    },
    limit: [
      { item: "Chicken and beef, at first", why: "The two most common canine food allergens, purely because they're the most commonly fed." },
      { item: "Multi-protein foods", why: "Impossible to run an elimination diet on a food with five meats in it." },
      { item: "Any excess weight", why: "Weight is the one part of brachycephalic breathing trouble an owner can actually fix." },
      { item: "Eating in heat or after exercise", why: "A panting Frenchie swallows even more air. Feed when it's cool and calm." },
    ],
    favour: [
      { item: "Slow-feeder bowls", why: "Directly reduces the air swallowed, and with it the wind." },
      { item: "Elimination diets run properly", why: "Twelve weeks, one protein, nothing else. Half-measures tell you nothing." },
      { item: "Shaped kibble", why: "Made for a jaw that can't work a round pellet." },
    ],
    recipes: ["turkey-pumpkin-oat", "salmon-sweet-potato", "chicken-green-bean"],
  },
  "Golden Retriever": {
    headline: "Skip the boutique grain-free",
    body: "Goldens have the highest cancer rate of any breed and a strong appetite that makes weight gain easy, so antioxidants and portion control both matter. The specific thing to know: the FDA's investigation into diet-associated dilated cardiomyopathy found Golden Retrievers heavily represented, linked to boutique grain-free foods built on peas and lentils. For {name}, a conventional food from an established manufacturer is the safer choice.",
    macros: { protein: { min: 24, max: 28 }, fat: { min: 12, max: 16 }, fibre: { min: 3, max: 5 } },
    mealPattern: "2 measured meals",
    mealWhy: "A deep-chested breed with a big appetite — split the day and don't exercise hard around meals.",
    nutrients: [
      { label: "Taurine", why: "Central to the diet-associated DCM picture that hit this breed hardest.", icon: "heart-text" },
      { label: "Antioxidants", why: "Vitamin E, C and carotenoids, for the breed with the highest documented cancer risk.", icon: "sparkles" },
      { label: "Omega-3 (EPA/DHA)", why: "Joints, coat and the skin conditions Goldens are prone to.", icon: "fish" },
      { label: "Glucosamine and chondroitin", why: "Hip and elbow dysplasia are common in the breed.", icon: "shield" },
    ],
    formats: {
      dry: { fit: "best", note: "From an established manufacturer that runs feeding trials — for this breed specifically, that pedigree matters." },
      mixed: { fit: "good", note: "A conventional dry base with wet stirred through." },
      wet: { fit: "good", note: "Palatable and hydrating; costly at 30 kg of dog." },
      fresh: { fit: "good", note: "Fine when properly formulated, with taurine explicitly accounted for. Vet supplement required." },
      raw: { fit: "sometimes", note: "Bacterial risk with no breed-specific upside. Vet-supervised only." },
    },
    limit: [
      { item: "Boutique grain-free diets", why: "Peas, lentils and chickpeas replacing grain is the pattern the FDA's DCM investigation centred on, and Goldens were over-represented in the reports. If you want grain-free, ask your vet first." },
      { item: "Exotic novel proteins without a reason", why: "Kangaroo and alligator formulas came up repeatedly in the same investigation. Novel proteins are for diagnosed allergies, not for variety." },
      { item: "Free-feeding", why: "This breed will happily eat past what it needs." },
    ],
    favour: [
      { item: "Established brands with feeding trials", why: "A food tested on live dogs over months, not just formulated on paper." },
      { item: "Weighed portions", why: "Goldens hide weight gain under a lot of coat." },
    ],
    recipes: ["salmon-sweet-potato", "chicken-green-bean", "turkey-pumpkin-oat"],
  },
  Poodle: {
    headline: "Coat, gut, and a deep chest",
    body: "Poodles are among the most intelligent and most sensitive dogs there are, and the sensitivity extends to the gut and the skin. Standards are deep-chested enough to carry a real bloat risk, and that famous coat is the first thing to show when {name}'s diet is short on fat quality.",
    macros: { protein: { min: 24, max: 30 }, fat: { min: 12, max: 16 }, fibre: { min: 3, max: 5 } },
    mealPattern: "2 meals for Standards, 3 for Toys and Minis",
    mealWhy: "Small Poodles can drop their blood sugar between meals; large ones bloat on big ones.",
    nutrients: [
      { label: "Omega-3 and -6 in balance", why: "The coat is the breed's calling card and the first place a fat imbalance shows.", icon: "fish" },
      { label: "Highly digestible protein", why: "Poodles have notably sensitive stomachs for their size.", icon: "bone" },
      { label: "Dental-friendly texture", why: "Toy and Miniature Poodles get periodontal disease early and badly.", icon: "sparkles" },
      { label: "Zinc and biotin", why: "Direct support for skin barrier and coat structure.", icon: "sparkles" },
    ],
    formats: {
      dry: { fit: "best", note: "Size-appropriate kibble — small-breed for Toys and Minis, large-breed for Standards." },
      mixed: { fit: "good", note: "Dry base with wet for palatability. Poodles can be genuinely fussy." },
      fresh: { fit: "good", note: "Suits a sensitive stomach well. Vet supplement required." },
      wet: { fit: "good", note: "Practical for Toys and Minis; expensive for a Standard." },
      raw: { fit: "sometimes", note: "No breed-specific advantage. Vet-supervised only." },
    },
    limit: [
      { item: "Sudden food changes", why: "This gut reacts. Five days minimum on any switch." },
      { item: "One large meal in a Standard", why: "Deep chest, bloat risk. Same rule as the Shepherd." },
      { item: "Sticky, soft treats in small Poodles", why: "They sit on teeth that are already crowded and prone to disease." },
    ],
    favour: [
      { item: "Puzzle feeders", why: "One of the smartest breeds there is. A bowl is a wasted opportunity." },
      { item: "Size-matched kibble", why: "A Toy Poodle and a Standard are effectively different dogs at the bowl." },
    ],
    recipes: ["salmon-sweet-potato", "turkey-pumpkin-oat", "chicken-green-bean"],
  },
  Bulldog: {
    headline: "Allergy-prone and heat-limited",
    body: "English Bulldogs combine the flattest face in common ownership with some of the most reactive skin, so food allergies, skin fold infections and wind are all part of the same picture. Weight is the lever that matters most: {name}'s airway and joints both improve measurably with every kilo that comes off.",
    macros: { protein: { min: 22, max: 26 }, fat: { min: 10, max: 14 }, fibre: { min: 4, max: 6 } },
    mealPattern: "2 small meals, slow feeder, never right after exercise",
    mealWhy: "Gulped air plus a flat face plus heat is the combination that puts Bulldogs in trouble.",
    nutrients: [
      { label: "Limited, novel protein", why: "Food allergy is a leading cause of the skin trouble this breed lives with.", icon: "fish" },
      { label: "Omega-3", why: "Calms the inflamed skin and helps the fold dermatitis Bulldogs get.", icon: "leaf" },
      { label: "Lean body weight", why: "Directly improves an airway that is compromised by anatomy.", icon: "scale" },
      { label: "Joint support", why: "Hip dysplasia is near-universal in the breed. Weight and glucosamine both help.", icon: "shield" },
    ],
    formats: {
      dry: { fit: "good", note: "Brachycephalic-shaped kibble in a limited-ingredient formula." },
      fresh: { fit: "best", note: "Total control over the ingredient list, which is what a chronically itchy Bulldog needs. Vet supplement required." },
      wet: { fit: "good", note: "Easy to eat and easy to keep single-protein." },
      mixed: { fit: "good", note: "Acceptable so long as everything stays inside the elimination diet." },
      raw: { fit: "sometimes", note: "Bacterial risk on a breed with a lot of existing problems. Vet-supervised only." },
    },
    limit: [
      { item: "Chicken, beef and dairy, at first", why: "The most common canine food allergens, and the usual first things to remove." },
      { item: "Excess calories", why: "Weight is the biggest single modifiable factor in brachycephalic breathing." },
      { item: "Eating in the heat", why: "Feed in the cool part of the day. A Bulldog struggling to cool itself shouldn't also be digesting." },
    ],
    favour: [
      { item: "Slow-feeder bowls", why: "Less swallowed air, less wind, less discomfort." },
      { item: "Shallow, wide bowls", why: "A flat face can't work a deep one." },
    ],
    recipes: ["turkey-pumpkin-oat", "salmon-sweet-potato", "chicken-green-bean"],
  },
  Beagle: {
    headline: "A nose that finds every calorie",
    body: "Beagles were bred to follow a scent for hours without losing interest, and that same drive is pointed at the kitchen bin. Obesity is the breed's number one health problem by a wide margin, and hypothyroidism — which makes weight gain easier still — is also common. For {name}, security matters as much as portion size.",
    macros: { protein: { min: 24, max: 28 }, fat: { min: 10, max: 14 }, fibre: { min: 4, max: 7 } },
    mealPattern: "2 weighed meals, with treats counted in",
    mealWhy: "Everything a Beagle eats has to be accounted for, because it will find more if you don't.",
    nutrients: [
      { label: "Fibre", why: "Fullness without calories, for a dog whose appetite never files a report.", icon: "leaf" },
      { label: "Lean protein", why: "Holds muscle through the weight loss most adult Beagles need at some point.", icon: "bone" },
      { label: "L-carnitine", why: "Supports fat metabolism where obesity is the defining risk.", icon: "flame" },
      { label: "Omega-3", why: "Joints under a body that is usually carrying more than it should.", icon: "fish" },
    ],
    formats: {
      dry: { fit: "best", note: "Weighable, and satiety formulas are built for exactly this problem." },
      mixed: { fit: "good", note: "Bulk a measured dry portion out with steamed vegetables." },
      fresh: { fit: "good", note: "Vegetable-heavy fresh food fills a Beagle up cheaply. Vet supplement required." },
      wet: { fit: "sometimes", note: "Palatable, which is the last thing this appetite needs help with." },
      raw: { fit: "sometimes", note: "No advantage for the breed's central problem. Vet-supervised only." },
    },
    limit: [
      { item: "Uncounted treats", why: "Training a Beagle takes a lot of treats. Take them out of the daily allowance, not on top of it." },
      { item: "Accessible bins and counters", why: "This is a food-safety issue, not just a diet one — bin-raiding is how Beagles reach the toxic list." },
      { item: "Free-feeding", why: "There is no version of this that ends well." },
    ],
    favour: [
      { item: "Scent-work feeders", why: "Snuffle mats and scatter feeding use the breed's actual talent and stretch a small meal out." },
      { item: "Lockable bins", why: "The most effective piece of nutrition equipment you can buy for a Beagle." },
    ],
    recipes: ["chicken-green-bean", "turkey-pumpkin-oat", "beef-rice-carrot"],
  },
  Rottweiler: {
    headline: "Grow slowly, stay lean",
    body: "The most consequential nutrition decisions for a Rottweiler happen before eighteen months. Feeding a large-breed puppy too much, or supplementing its calcium, makes the skeleton grow faster than the joints can support — and that is how hip and elbow dysplasia gets locked in. As an adult, {name} carries a deep-chested bloat risk and a frame that must not be allowed to get heavy.",
    macros: { protein: { min: 24, max: 28 }, fat: { min: 12, max: 16 }, fibre: { min: 3, max: 5 } },
    mealPattern: "2–3 meals, never one large one",
    mealWhy: "Deep chest, bloat risk. Split the day and leave an hour either side of hard exercise.",
    nutrients: [
      { label: "Controlled calcium in puppies", why: "The single most important line here. Large-breed puppy food already balances it — adding more does harm, not good.", icon: "shield" },
      { label: "Glucosamine and chondroitin", why: "Hip and elbow dysplasia are among the breed's defining problems.", icon: "shield" },
      { label: "Omega-3 (EPA/DHA)", why: "Joint inflammation in a heavy, hard-working frame.", icon: "fish" },
      { label: "Quality protein, moderate fat", why: "Builds muscle without pushing growth rate up.", icon: "bone" },
    ],
    formats: {
      dry: { fit: "best", note: "Large-breed formulas exist precisely for this growth problem. Use a slow feeder." },
      mixed: { fit: "good", note: "Dry base with wet or fresh stirred through." },
      fresh: { fit: "good", note: "Good for adults; for puppies, the calcium and phosphorus balance has to be formulated by a vet, not estimated." },
      wet: { fit: "sometimes", note: "Expensive to feed a 50 kg dog on, and harder to portion precisely." },
      raw: { fit: "sometimes", note: "Common in the breed, but calcium balance in a growing Rottweiler is not something to improvise. Vet-supervised only." },
    },
    limit: [
      { item: "Calcium supplements in puppies", why: "Actively harmful. It accelerates bone growth past what the joints can carry." },
      { item: "Adult food for a large-breed puppy", why: "Adult formulas aren't built for controlled growth and can push it too fast." },
      { item: "One big daily meal", why: "Deep chest, torsion risk. Split it." },
      { item: "Overfeeding during growth", why: "A fat puppy is not a well-fed puppy. It's a joint problem being assembled." },
    ],
    favour: [
      { item: "Large-breed puppy food until 18–24 months", why: "Controlled calories, controlled calcium, controlled growth rate." },
      { item: "Body condition scoring", why: "Ribs felt easily under a thin layer, waist visible from above. Trust that over the number on the scale." },
    ],
    recipes: ["beef-rice-carrot", "salmon-sweet-potato", "turkey-pumpkin-oat"],
  },
};

/* ── Lookups ───────────────────────────────────────────────────────────────── */

/** The nutrition profile for a pet, falling back to the species baseline for
 *  breeds outside the picklist (custom / "Other" breeds). */
export function nutritionFor(pet: Pick<Pet, "breed" | "species">): BreedNutrition {
  return BREED_NUTRITION[pet.breed] ?? (pet.species === "cat" ? CAT_DEFAULT : DOG_DEFAULT);
}

/** True when the profile is breed-specific rather than the species baseline. */
export function hasBreedProfile(pet: Pick<Pet, "breed">): boolean {
  return BREED_NUTRITION[pet.breed] != null;
}

/** Substitutes `{name}`, `{breed}` and `{species}` in copy with the pet's own details. */
export function fillCopy(text: string, pet: Pick<Pet, "name" | "breed" | "species">): string {
  return text
    .replace(/\{name\}/g, pet.name)
    .replace(/\{breed\}/g, pet.breed)
    .replace(/\{species\}/g, pet.species);
}

/* ── Sections ──────────────────────────────────────────────────────────────── */

export type SectionId = "targets" | "food" | "bowl" | "recipes" | "cost";

export interface NutritionSection {
  id: SectionId;
  /** Short form for the nav bar. */
  navTitle: string;
  /** Full heading on the hub row and at the top of the detail screen. */
  title: string;
  /** The one line that has to make someone tap, or decide not to. */
  blurb: string;
  icon: IconName;
}

/**
 * The five things this feature knows, as a menu.
 *
 * One list, shared by the hub and the detail route, so a section can never
 * appear in one and not the other. Titles and blurbs carry `{name}`/`{breed}`
 * and go through `fillCopy` at render.
 */
export const NUTRITION_SECTIONS: NutritionSection[] = [
  {
    id: "targets",
    navTitle: "Daily targets",
    title: "Daily targets",
    blurb: "How much {name} needs, how to split it across the day, and the protein, fat and fibre a {breed} should be getting.",
    icon: "scale",
  },
  {
    id: "food",
    navTitle: "Best food",
    title: "Best food for a {breed}",
    blurb: "Dry, wet, fresh or raw — which form actually suits this breed, and the handful of things worth checking on the label.",
    icon: "bowl",
  },
  {
    id: "bowl",
    navTitle: "What goes in",
    title: "What goes in the bowl",
    blurb: "Ingredients to go out of your way for, what to keep low for a {breed}, and the list that is never safe for any {species}.",
    icon: "leaf",
  },
  {
    id: "recipes",
    navTitle: "Home recipes",
    title: "Cook it yourself",
    blurb: "Recipes scaled to {name}'s own calories rather than a generic cup measure, with the method and the safety caveats.",
    icon: "flame",
  },
  {
    id: "cost",
    navTitle: "Cost",
    title: "What it costs",
    blurb: "Put in what you pay for a pack and see the real cost per day, month and year — and which format is cheapest.",
    icon: "coin",
  },
];

export function sectionById(id: string): NutritionSection | undefined {
  return NUTRITION_SECTIONS.find((s) => s.id === id);
}

/**
 * The leading meal count from a profile's `mealPattern` ("2–3 smaller meals,
 * never one large one" → "2–3"), for the hub's glance strip.
 *
 * Parsed rather than stored as its own field so the count and the sentence can
 * never drift apart, and it degrades to a dash rather than to a wrong number if
 * a future entry breaks the convention.
 */
export function mealCountLabel(profile: BreedNutrition): string {
  return profile.mealPattern.match(/^\d+(?:[–-]\d+)?/)?.[0] ?? "—";
}

export function recipeById(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}

/** The breed's recommended recipes, best first, filtered to the right species. */
export function recipesFor(pet: Pick<Pet, "breed" | "species">): Recipe[] {
  const ids = nutritionFor(pet).recipes;
  const picked = ids.map(recipeById).filter((r): r is Recipe => r != null && r.species === pet.species);
  // Any remaining same-species recipes trail the curated ones, so the rail never
  // hides content just because a profile didn't name it.
  const rest = RECIPES.filter((r) => r.species === pet.species && !picked.includes(r));
  return [...picked, ...rest];
}

/** Formats for a breed, best fit first. */
export function formatsFor(pet: Pick<Pet, "breed" | "species">): { id: FormatId; fit: Fit; note: string }[] {
  const formats = nutritionFor(pet).formats;
  return (Object.keys(formats) as FormatId[])
    .map((id) => ({ id, ...formats[id]! }))
    .sort((a, b) => FIT_RANK[a.fit] - FIT_RANK[b.fit]);
}

/* ── Energy & portions ─────────────────────────────────────────────────────── */

/**
 * Where a pet's daily calorie figure came from, carried alongside the number.
 *
 * The cost calculator is only trustworthy if the owner can see what it is
 * dividing by, so the basis travels with the value and is printed on screen
 * rather than assumed.
 */
export interface EnergyBasis {
  kcal: number;
  source: "guide" | "target" | "estimate";
  /** One line naming the source, shown under the figure. */
  label: string;
}

/** Resting energy requirement — the vet standard, 70 × bodyweight^0.75. */
function restingEnergy(weightKg: number): number {
  return 70 * Math.pow(Math.max(0.5, weightKg), 0.75);
}

/**
 * Maintenance multipliers applied to RER. Conservative middle-of-the-road
 * figures for a neutered adult pet at normal activity — the population most pets
 * belong to. Growing animals get the higher factor.
 */
function maintenanceFactor(species: "cat" | "dog", ageYears: number): number {
  const growing = ageYears < 1;
  if (species === "cat") return growing ? 2.5 : 1.2;
  return growing ? 2.2 : 1.6;
}

/**
 * The pet's daily calories, with a stated source. Tries the vet guide first, then
 * a gram target the family set themselves, then the RER formula — so the
 * calculator still works for a breed that isn't on the guide list, rather than
 * showing a dash.
 */
export function energyBasis(pet: Pet): EnergyBasis {
  const fromGuide = dailyKcal(pet);
  if (fromGuide != null) {
    const stage = pet.ageYears < 0.5 ? "3-month" : pet.ageYears < 1.5 ? "young" : "adult";
    return { kcal: fromGuide, source: "guide", label: `Vet feeding guide — ${stage} ${pet.breed}` };
  }
  const grams = pet.customPlan?.fedGrams;
  if (grams != null && grams > 0) {
    return {
      kcal: Math.round((grams / 100) * TYPICAL_KCAL_PER_100G.dry),
      source: "target",
      label: `Your ${grams} g/day target, at typical kibble density`,
    };
  }
  const kcal = Math.round(restingEnergy(pet.weightKg) * maintenanceFactor(pet.species, pet.ageYears));
  return {
    kcal,
    source: "estimate",
    label: `Estimated from ${pet.weightKg} kg body weight (70 × kg^0.75 × activity)`,
  };
}

/** Daily energy band (kcal) from the vet guide, when the breed has one. */
export function dailyEnergy(pet: Pick<Pet, "ageYears" | "breed" | "gender">): { min: number; max: number } | undefined {
  const entry = weightFeedingEntry(pet);
  if (!entry) return undefined;
  return { min: entry.calorieRange[0], max: entry.calorieRange[1] };
}

/** Midpoint of the daily energy band — the figure every portion is derived from. */
export function dailyKcal(pet: Pick<Pet, "ageYears" | "breed" | "gender">): number | undefined {
  const band = dailyEnergy(pet);
  return band ? Math.round((band.min + band.max) / 2) : undefined;
}

/**
 * Typical energy density per format, kcal/100 g, used when the owner hasn't read
 * the figure off their own bag. Deliberately conservative mid-range values:
 * dry food runs 320–420, wet 70–100 (it is mostly water), home-cooked 100–190.
 */
export const TYPICAL_KCAL_PER_100G: Record<FormatId, number> = {
  dry: 370,
  wet: 85,
  mixed: 230,
  fresh: 140,
  raw: 160,
};

/** Grams of a food of known energy density that cover `kcal`. */
export function gramsForDensity(kcal: number, kcalPer100g: number): number {
  return Math.round((kcal / Math.max(1, kcalPer100g)) * 100);
}

/**
 * Grams per day of a given format for this pet.
 *
 * Calories are the invariant, not grams: the same dog needs roughly 460 g of
 * kibble or 2,000 g of wet food for the same energy. Anything that quotes one
 * number across formats is wrong by a factor of four, which is exactly the
 * mistake the cost comparison exists to prevent.
 *
 * Dry food with no owner-supplied density is the one case that does NOT go
 * through the formula: the vet guide already publishes a kibble gram range for
 * this breed, age and sex, and the Plan tab prints it. Deriving a slightly
 * different number here from an assumed density would put two figures a few per
 * cent apart on two tabs of the same screen, which reads as a bug.
 */
export function portionGrams(pet: Pet, format: FormatId, kcalPer100g?: number): number {
  if (format === "dry" && !(kcalPer100g && kcalPer100g > 0)) {
    const range = weightFeedingEntry(pet)?.kibbleGramsRange;
    if (range) return Math.round((range[0] + range[1]) / 2);
  }
  const density = kcalPer100g && kcalPer100g > 0 ? kcalPer100g : TYPICAL_KCAL_PER_100G[format];
  return gramsForDensity(energyBasis(pet).kcal, density);
}

/** Scale a recipe to a total finished weight, rounding each row to whole grams. */
export function scaleRecipe(recipe: Recipe, totalGrams: number): { item: string; grams: number; note?: string }[] {
  return recipe.ingredients.map((i) => ({
    item: i.item,
    grams: Math.max(1, Math.round((i.gramsPerKg * totalGrams) / 1000)),
    note: i.note,
  }));
}

/* ── Cost ──────────────────────────────────────────────────────────────────── */

export interface CostInput {
  /** Price of one pack, in the chosen currency. */
  price: number;
  /** Weight of a single pack/tin in grams. */
  packGrams: number;
  /** How many packs/tins come in the purchase (a 12-tin box is 85 g × 12). */
  packCount: number;
  /** What the pet eats per day of this format. */
  gramsPerDay: number;
  /** Optional: kcal per 100 g off the bag, for the true per-calorie comparison. */
  kcalPer100g?: number;
}

export interface CostResult {
  perDay: number;
  perWeek: number;
  perMonth: number;
  perYear: number;
  /** Total grams in the purchase. */
  totalGrams: number;
  /** How many days one purchase lasts. */
  packDays: number;
  /** ms epoch when the current purchase runs out, counting from now. */
  runsOutAt: number;
  /** Cost of 1,000 kcal — the only figure that compares two foods honestly.
   *  Undefined until the owner supplies the bag's energy density. */
  per1000kcal?: number;
}

/** Average month length, so a monthly figure isn't 28-day or 31-day dependent. */
const DAYS_PER_MONTH = 365.25 / 12;

export function computeCost(input: CostInput, now: number = Date.now()): CostResult | undefined {
  const { price, packGrams, packCount, gramsPerDay, kcalPer100g } = input;
  if (!(price > 0) || !(packGrams > 0) || !(packCount > 0) || !(gramsPerDay > 0)) return undefined;
  const totalGrams = packGrams * packCount;
  const perGram = price / totalGrams;
  const perDay = perGram * gramsPerDay;
  const packDays = totalGrams / gramsPerDay;
  return {
    perDay,
    perWeek: perDay * 7,
    perMonth: perDay * DAYS_PER_MONTH,
    perYear: perDay * 365.25,
    totalGrams,
    packDays,
    runsOutAt: now + packDays * 86_400_000,
    per1000kcal: kcalPer100g && kcalPer100g > 0 ? (perGram * 1000 * 100) / kcalPer100g : undefined,
  };
}
