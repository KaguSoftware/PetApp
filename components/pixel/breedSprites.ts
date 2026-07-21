import type { Sprite } from "./PixelSprite";
import { CAT_FUR, CAT_SPRITE, DOG_FUR, DOG_SPRITE } from "./petSprites";
import type { Pet } from "@/lib/data";

/*
 * Breed-specific 16×16 pet heads. Each sprite is hand-tuned so the silhouette
 * (ear shape especially) and coloring/markings read as that breed at a glance,
 * matching the picklists in lib/data.ts (DOG_BREEDS / CAT_BREEDS). A breed not
 * in these maps (custom text, or "Other") falls back to the plain species
 * sprite in petSprites.ts.
 */

// ---------------------------------------------------------------------------
// Dogs
// ---------------------------------------------------------------------------

const LABRADOR_RETRIEVER: Sprite = {
  // Solid golden coat, broad rounded floppy ears, no facial markings.
  palette: { O: "#5a4326", B: "#e8c078", S: "#c99a52", W: "#fff6df", e: "#3a2a1a", n: "#2b2118", p: "#e8a9b8" },
  rows: [
    "................",
    ".OOO......OOO...",
    "OSSSO....OSSSO..",
    "OSSSSO..OSSSSO..",
    "OSSBBBOOOBBBSSO.",
    ".OBBBBBBBBBBBO..",
    "OBBBBBBBBBBBBBO.",
    "OBBeBBBBBBBeBBO.",
    "OBBBBBBBBBBBBBO.",
    "OBBBBWWWWWWBBBO.",
    "OBBBWWWnnWWWBBO.",
    ".OBBWWnnnnWWBO..",
    ".OBBWWppppWWBO..",
    "..OBBWWWWWWBO...",
    "...OBBBBBBBO....",
    "....OOOOOOO.....",
  ],
};

const GOLDEN_RETRIEVER: Sprite = {
  // Like the Lab but richer red-gold, longer ears with feathered fringe texture.
  palette: { O: "#5a3a1a", B: "#dba054", S: "#b87830", W: "#fff2d9", e: "#3a2a1a", n: "#2b2118", p: "#e8a9b8" },
  rows: [
    "................",
    ".OOO......OOO...",
    "OSSSO....OSSSO..",
    "OSSSSO..OSSSSO..",
    "OSSSSSOOSSSSSO..",
    "OSSBSBBBBBSBSSO.",
    "OBBSBBBBBBBSBBO.",
    "OBBeBBBBBBBeBBO.",
    "OBBBBBBBBBBBBBO.",
    "OBBBBWWWWWWBBBO.",
    "OBBBWWWnnWWWBBO.",
    ".OBBWWnnnnWWBO..",
    ".OBBWWppppWWBO..",
    "..OBSWWWWWWSBO..",
    "...OBBBBBBBO....",
    "....OOOOOOO.....",
  ],
};

const GERMAN_SHEPHERD: Sprite = {
  // Tall erect pointed ears, black saddle mask over the top of the head, tan cheeks/muzzle.
  palette: { O: "#241a12", B: "#c98a44", S: "#a56b2c", W: "#f3d9a8", k: "#1c1712", e: "#1c1712", n: "#120e0a" },
  rows: [
    "................",
    "..OO......OO....",
    ".OkkO....OkkO...",
    ".OkkkO..OkkkO...",
    "OOkkkkOOkkkkkO..",
    "OkkkkkkkkkkkkkO.",
    "OkkBBBBBBBBkkkO.",
    "OBBBeBBBBBeBBkO.",
    "OBBBBBBBBBBBBBO.",
    "OBBBBWWWWWWBBBO.",
    "OBBBWWWnnWWWBBO.",
    ".OBkWWnnnnWWkBO.",
    ".OBkWWWWWWWkBO..",
    "..OkBBBBBBBkO...",
    "...OBBBBBBBO....",
    "....OOOOOOO.....",
  ],
};

const POODLE: Sprite = {
  // Dense curly texture (alternating fur flecks) all over, long curly ears, apricot tone, pom-pom head.
  palette: { O: "#6b4a2a", B: "#e6b878", S: "#cf9d5c", c: "#a97a3e", W: "#fff3de", e: "#2b2118", n: "#2b2118", p: "#e8a9b8" },
  rows: [
    "................",
    ".cOcO.OcOOc.O...",
    "OcBcOOcOOBcOO...",
    "OcBBcOccOBBcO...",
    "OcBBBcOOBBBcO...",
    ".OcBBBBBBBcO....",
    "OcBBBBBBBBBcO...",
    "OBBceBcccBecBO..",
    "OBBBcBBBBcBBBO..",
    "OBBBBWWWWWWBBO..",
    "OBBBWWWnnWWWBBO.",
    ".OcBWWnnnnWWcO..",
    ".OcBWWppppWWcO..",
    "..OcBWWWWWWcO...",
    "...OcBBBBBcO....",
    "....OOcOOcOO....",
  ],
};

const BULLDOG: Sprite = {
  // Small folded ears set high, deep wrinkles, flat pushed-in nose, wide underbite jowls, white/fawn.
  palette: { O: "#5a4838", B: "#e9dcc4", S: "#cbb891", W: "#ffffff", e: "#2b2118", n: "#1c1712", p: "#e8a9b8" },
  rows: [
    "................",
    "..OO......OO....",
    ".OSSO....OSSO...",
    "OSBBBOOOOBBBSO..",
    "OBBBSBBBBSBBBO..",
    "OBSBBBBBBBBSBO..",
    "OBBBBBBBBBBBBO..",
    "OBBeSBBBBSeBBO..",
    "OBBBBnnnnBBBBO..",
    "OBBBWWnnWWBBBO..",
    "OBBWWWWWWWWBBO..",
    ".OBWpWWWWWpBO...",
    ".OBBWWWWWWBBO...",
    "..OBBBBBBBBO....",
    "...OBBBBBBO.....",
    "....OOOOOO......",
  ],
};

const FRENCH_BULLDOG: Sprite = {
  // Iconic large rounded "bat" ears standing straight up, flat brachycephalic face, fawn coat.
  palette: { O: "#5a4838", B: "#e0b98a", S: "#c99a68", W: "#fff3de", e: "#2b2118", n: "#1c1712", p: "#e8a9b8" },
  rows: [
    "................",
    ".OOOO....OOOO...",
    "OBBBBO..OBBBBO..",
    "OBBBBO..OBBBBO..",
    "OBBBBOOOOBBBBO..",
    ".OBBBBBBBBBBO...",
    "OBBBBBBBBBBBBO..",
    "OBBeSBBBBSeBBO..",
    "OBBBBnnnnBBBBO..",
    "OBBBWWnnWWBBBO..",
    "OBBWWWWWWWWBBO..",
    ".OBWpWWWWWpBO...",
    ".OBBWWWWWWBBO...",
    "..OBBBBBBBBO....",
    "...OBBBBBBO.....",
    "....OOOOOO......",
  ],
};

const BEAGLE: Sprite = {
  // Tricolor: black saddle on crown, tan around ears/cheeks, white blaze down the muzzle, long low ears.
  palette: { O: "#3a2a1c", B: "#8a5a34", S: "#6d4526", k: "#241a12", W: "#ffffff", e: "#241a12", n: "#1c1712", p: "#e8a9b8" },
  rows: [
    "................",
    ".OBB......BBO...",
    "OBBBO....OBBBO..",
    "OBBBBO..OBBBBO..",
    "OkkBBBOOOBBBkkO.",
    ".OkkBBBBBBBkkO..",
    "OBkkBBBBBBBkkBO.",
    "OBBkWBBBBWkBBO..",
    "OBBBWWWWWWBBBO..",
    "OBBBWWWWWWBBBO..",
    "OBBWWWnnWWWBBO..",
    ".OBWWnnnnWWBO...",
    ".OBWWppppWWBO...",
    "..OWWWWWWWWO....",
    "...OBBBBBBO.....",
    "....OOOOOO......",
  ],
};

const ROTTWEILER: Sprite = {
  // Black coat with iconic mahogany/tan eyebrow dots, cheeks, and muzzle; medium floppy black ears.
  palette: { O: "#150f0a", B: "#211712", S: "#120d09", t: "#a5622c", W: "#8a4f24", e: "#110c08", n: "#0c0908" },
  rows: [
    "................",
    ".OSS......SSO...",
    "OSSSO....OSSSO..",
    "OSSSSOOOOSSSSO..",
    "OSSBBBBBBBBSSO..",
    ".OBBttBBttBBO...",
    "OBBBttBBttBBBO..",
    "OBBeBBBBBBeBBO..",
    "OBBBBBBBBBBBBO..",
    "OBBBWtWWWtWBBO..",
    "OBBBWWWnnWWWBBO.",
    ".OBBWWnnnnWWBO..",
    ".OBBWtttttWBO...",
    "..OBBWWWWWBO....",
    "...OBBBBBBO.....",
    "....OOOOOOO.....",
  ],
};

export const DOG_BREED_SPRITES: Record<string, Sprite> = {
  "Labrador Retriever": LABRADOR_RETRIEVER,
  "Golden Retriever": GOLDEN_RETRIEVER,
  "German Shepherd": GERMAN_SHEPHERD,
  Poodle: POODLE,
  Bulldog: BULLDOG,
  "French Bulldog": FRENCH_BULLDOG,
  Beagle: BEAGLE,
  Rottweiler: ROTTWEILER,
};

// ---------------------------------------------------------------------------
// Cats
// ---------------------------------------------------------------------------

const STRAY_CAT: Sprite = {
  // Mixed-breed tabby: warm brown coat with a dark "M" tabby mark on the forehead.
  palette: { O: "#3a2c22", B: "#b28a5c", S: "#8c6a44", W: "#f3ddb8", e: "#4a7a3a", h: "#ffffff", n: "#2b2118", p: "#e8a9b8", m: "#6d4e30" },
  rows: [
    "................",
    ".OO........OO...",
    ".OSO......OSO...",
    ".OBSO....OSBO...",
    ".OBmBOOOOBmBO...",
    ".OBmBBBBBBmBO...",
    "OBBBBBBBBBBBBBO.",
    "OBBeeBBBBBBeeBO.",
    "OBBheBBBBBBheBO.",
    "OBpBBBBnnBBBBpO.",
    "OBBBBWWnnWWBBBO.",
    "OBBBBWWWWWWBBBO.",
    ".OBBBBWWWWBBBBO.",
    ".OBBBBBBBBBBBBO.",
    "..OBBBBBBBBBBO..",
    "...OOOOOOOOOO...",
  ],
};

const PERSIAN: Sprite = {
  // Flat brachycephalic face, small ears buried in a fluffy round mane, cream longhair.
  palette: { O: "#8a7a68", B: "#f2e7d3", S: "#dcc9a8", W: "#ffffff", e: "#c98a2e", n: "#8a5a3a", p: "#e8b6c6" },
  rows: [
    "................",
    "..SO......OS....",
    ".SBSO....OSBS...",
    "OBBBSOOOOSBBBO..",
    "OBBBBBBBBBBBBO..",
    "OSBBBBBBBBBBSO..",
    "OBBBBBBBBBBBBBO.",
    "OBBeeBBBBBBeeBO.",
    "OBBBnBBBBBnBBBO.",
    "OBBBBBnnBBBBBBO.",
    "OSBBBWWWWBBBBSO.",
    "OBBBBWWWWBBBBBO.",
    ".OBBBWWWWBBBBO..",
    ".OSBBBBBBBBBSO..",
    "..OSBBBBBBBSO...",
    "...OOOOOOOOOO...",
  ],
};

const MAINE_COON: Sprite = {
  // Big ears with lynx tufts poking past the outline, brown tabby "M" mark, ruff of fur at the cheeks.
  palette: { O: "#3a2c22", B: "#b8875a", S: "#8c6238", W: "#f3ddb8", e: "#d9a02e", h: "#ffffff", n: "#3a2418", p: "#e8a9b8", m: "#6d4a2a", t: "#c9a878" },
  rows: [
    "t.O........O.t..",
    ".tOSO....OSOt...",
    "..OBSO..OSBO....",
    ".OBmBOOOOBmBO...",
    "OBBmBBBBBBmBBO..",
    "OBBBBBBBBBBBBBO.",
    "tBBBBBBBBBBBBBt.",
    "tBBeeBBBBBBeeBt.",
    "tBBheBBBBBBheBt.",
    "OBpBBBBnnBBBBpO.",
    "OBBBBWWnnWWBBBO.",
    "OBBBBWWWWWWBBBO.",
    ".OBBBBWWWWBBBBO.",
    ".tBBBBBBBBBBBBt.",
    "..tBBBBBBBBBBt..",
    "...tOOOOOOOOt...",
  ],
};

const SIAMESE: Sprite = {
  // Color-point: dark seal ears/mask on a cream body, wedge-shaped triangular ears, striking blue eyes.
  palette: { O: "#3a2c22", B: "#f0e2c8", S: "#d9c4a0", d: "#3a2418", W: "#fff6e6", e: "#3a86c8", n: "#2b1810", p: "#e8a9b8" },
  rows: [
    "................",
    "OdO........OdO..",
    "OddO......OddO..",
    "OdddOOOOOOOdddO.",
    "OdddBBBBBBBdddO.",
    ".OdBBBBBBBBBBdO.",
    "OddBBBBBBBBBBddO",
    "OddeeBBBBBBeeddO",
    "OdBdeBBBBBBedBdO",
    "OBpBBBBnnBBBBpO.",
    "OBBBBWWnnWWBBBO.",
    "OBBBBWWWWWWBBBO.",
    ".OBBBBWWWWBBBBO.",
    ".OdBBBBBBBBBdO..",
    "..OdBBBBBBBdO...",
    "...OOOOOOOOO....",
  ],
};

const BRITISH_SHORTHAIR: Sprite = CAT_SPRITE; // already authored as this breed — cool blue-gray plush coat.

const RAGDOLL: Sprite = {
  // Soft, lighter color-point (like Siamese but muted), fluffier rounder face, gentle blue eyes.
  palette: { O: "#5a4c40", B: "#f5ecd9", S: "#e3d6bc", d: "#a89478", W: "#ffffff", e: "#4fa3d8", h: "#ffffff", n: "#8a6a52", p: "#e8b6c6" },
  rows: [
    "................",
    ".dO........Od...",
    ".ddO......Odd...",
    "OdddOOOOOOOdddO.",
    "OBBdBBBBBBdBBO..",
    "OBBBBBBBBBBBBO..",
    "OBBBBBBBBBBBBBO.",
    "OBBeeBBBBBBeeBO.",
    "OBBheBBBBBBheBO.",
    "OBpBBBBnnBBBBpO.",
    "OBBBBWWnnWWBBBO.",
    "OBBBBWWWWWWBBBO.",
    ".OBBBBWWWWBBBBO.",
    ".OdBBBBBBBBBdO..",
    "..OdBBBBBBBdO...",
    "...OOOOOOOOO....",
  ],
};

const BENGAL: Sprite = {
  // Wild golden coat covered in dark rosette spots, sleek athletic face, small white muzzle patch, green eyes.
  palette: { O: "#3a2410", B: "#e0a24a", S: "#c9862e", m: "#5a3418", W: "#fff3de", e: "#3a8a3a", h: "#ffffff", n: "#2b1810", p: "#e8a9b8" },
  rows: [
    "................",
    ".OO........OO...",
    ".OSO......OSO...",
    ".OBSO....OSBO...",
    ".OBmBOOOOBmBO...",
    ".OBmBBBBBBmBO...",
    "OBBBBBBmBBBBBBO.",
    "OBBeemBBBBBeeBO.",
    "OBBhemBBBBBheBO.",
    "OBpBBmBnnBBBBpO.",
    "OBBBBWWnnWWBBBO.",
    "OBBmBWWWWWmBBBO.",
    ".OBBBWWWWBmBBO..",
    ".OBBmBBBBBBBBO..",
    "..OBBmBBBBBBO...",
    "...OOOOOOOOOO...",
  ],
};

const SCOTTISH_FOLD: Sprite = {
  // Ears folded forward flat against the round head (no upright tips at all), plush gray coat, big round eyes.
  palette: { O: "#4a4a52", B: "#a8adb8", S: "#82879a", W: "#e6e9ee", e: "#c9962e", h: "#ffffff", n: "#3a3a44", p: "#e8b6c6" },
  rows: [
    "................",
    "................",
    ".OOO......OOO...",
    "OBBBOOOOOOBBBO..",
    "OBBBBBBBBBBBBO..",
    "OSBBBBBBBBBBSO..",
    "OBBBBBBBBBBBBBO.",
    "OBBeeBBBBBBeeBO.",
    "OBBheBBBBBBheBO.",
    "OBpBBBBnnBBBBpO.",
    "OBBBBWWnnWWBBBO.",
    "OBBBBWWWWWWBBBO.",
    ".OBBBBWWWWBBBBO.",
    ".OBBBBBBBBBBBBO.",
    "..OBBBBBBBBBBO..",
    "...OOOOOOOOOO...",
  ],
};

export const CAT_BREED_SPRITES: Record<string, Sprite> = {
  "Stray Cat": STRAY_CAT,
  Persian: PERSIAN,
  "Maine Coon": MAINE_COON,
  Siamese: SIAMESE,
  "British Shorthair": BRITISH_SHORTHAIR,
  Ragdoll: RAGDOLL,
  Bengal: BENGAL,
  "Scottish Fold": SCOTTISH_FOLD,
};

/** The pet's head sprite: breed-specific art when we have it, else the plain species look. */
export function headSpriteForPet(pet: Pet): Sprite {
  const byBreed = pet.species === "cat" ? CAT_BREED_SPRITES[pet.breed] : DOG_BREED_SPRITES[pet.breed];
  if (byBreed) return byBreed;
  const fur = pet.species === "cat" ? CAT_FUR : DOG_FUR;
  const base = pet.species === "cat" ? CAT_SPRITE : DOG_SPRITE;
  return { ...base, palette: { ...base.palette, B: fur.body, S: fur.shade } };
}
