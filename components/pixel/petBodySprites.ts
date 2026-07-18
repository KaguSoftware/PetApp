import type { Sprite } from "./PixelSprite";

/*
 * 16×24 full-body pet sprites, used only by the /pets 3D viewer (Pet3D.tsx).
 * Everywhere else in the app keeps the face-only sprites from petSprites.ts.
 * Same palette convention as petSprites.ts:
 *   . transparent   O dark outline   B body/fur   S shade   W muzzle/light
 *   e eye           h eye highlight  n nose/mouth   p pink (ears/blush)
 * Body colors are placeholders; per-pet tint is applied by recoloring `B`/`S`
 * at render time via furSprite() from petSprites.ts.
 */
export const CAT_BODY_SPRITE: Sprite = {
  palette: { O: "#3a3d47", B: "#98a0ac", S: "#6d7480", W: "#c4c9d1", e: "#f0b52e", h: "#ffffff", n: "#b06a5e", p: "#f6b6c6" },
  rows: [
    "..O..........O..",
    ".OpO........OpO.",
    ".OBBO......OBBO.",
    ".OOOOOOOOOOOOOO.",
    ".OBBBBBBBBBBBBO.",
    ".OBBhBBBBBBhBBO.",
    ".OBBeBBBBBBeBBO.",
    ".OBBBBWnnWBBBBO.",
    ".OBBBBWWWWBBBBO.",
    ".OOOOOWWWWOOOOO.",
    "..OBBBBBBBBBBO..",
    "..OBBBBBBBBBBO..",
    ".OOOOOOOOOOOOOOO",
    ".OSSBBBBBBBBBBOB",
    ".OSSBBBBBBBBBBOB",
    ".OSSBBBBBBBBBBOB",
    ".OSSBBBBBBBBBBOB",
    ".OSSBBBBBBBBBBOB",
    ".OSSBBBBBBBBBBOB",
    ".OSSBBBBBBBBBBOB",
    ".OOOOOOOOOOOOOBB",
    "...OOO...OOO..OO",
    "...OWO...OWO....",
    "...OOO...OOO....",
  ],
};

export const DOG_BODY_SPRITE: Sprite = {
  palette: { O: "#2b2b3a", B: "#e9b872", S: "#c98f4a", W: "#fff3dd", e: "#2b2b3a", n: "#3a2a22", p: "#f3a5b8" },
  rows: [
    "................",
    "OOO..........OOO",
    "OSOOOOOOOOOOOOSO",
    "OSOOBBBBBBBBOOSO",
    "OSOOBBBBBBBBOOSO",
    "OOOOBBBBBBBBOOOO",
    "...OBeBBBBeBO...",
    "...OBOOOOOOBO...",
    "...OBOWnnWOBO...",
    "...OBOppppOBO...",
    "...OOOOOOOOOO...",
    "...OBBBBBBBBO...",
    "...OBBBBBBBBO.O.",
    "..OOOOOOOOOOOOB.",
    "..OSSBBBBBBBBOB.",
    "..OSSBBBBBBBBOB.",
    "..OSSBBBBBBBBOB.",
    "..OSSBBBBBBBBOB.",
    "..OSSBBBBBBBBOBO",
    "..OSSBBBBBBBBOBO",
    "..OOOOOOOOOOOO..",
    "...OOO..OOO.....",
    "...OWO..OWO.....",
    "...OOO..OOO.....",
  ],
};
