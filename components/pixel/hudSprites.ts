import type { Sprite } from "./PixelSprite";

/* Tiny HUD glyphs — coin, heart, star — for the arcade counters. */
export const COIN_SPRITE: Sprite = {
  palette: { O: "#a8791d", Y: "#f5c542", H: "#fff0b8", S: "#d99f2b" },
  rows: [
    ".OOOO.",
    "OYYYYO",
    "OYHHSO",
    "OYHSSO",
    "OSSSSO",
    ".OOOO.",
  ],
};

export const HEART_SPRITE: Sprite = {
  palette: { O: "#8f1f3a", R: "#e0443f", H: "#f7a8a0" },
  rows: [
    ".OO.OO.",
    "OHRRRHO",
    "ORRRRRO",
    ".ORRRO.",
    "..ORO..",
    "...O...",
  ],
};

export const STAR_SPRITE: Sprite = {
  palette: { O: "#a8791d", Y: "#f5c542", H: "#fff0b8" },
  rows: [
    "...O...",
    "..OYO..",
    "OOYHYOO",
    ".OYYYO.",
    ".OY.YO.",
    "O.O.O.O",
  ],
};

/** Small red exclamation mark — flags a care box with an outstanding "hasn't happened in a while" warning. */
export const WARNING_SPRITE: Sprite = {
  palette: { O: "#8f1f3a", R: "#e0443f", H: "#f7a8a0" },
  rows: [
    ".OOO.",
    "OHRRO",
    "OHRRO",
    "OHRRO",
    "OHRRO",
    "OHRRO",
    ".ORO.",
    ".....",
    ".ORO.",
  ],
};

export const SMILEY_SPRITE: Sprite = {
  palette: { O: "#a8791d", Y: "#f5c542", H: "#ffffff", B: "#3a2a10", P: "#ff9eb0" },
  rows: [
    ".OOOOOOO.",
    "OYYYYYYYO",
    "OYYYYYYYO",
    "OYBYYYBYO",
    "OYHYYYHYO",
    "OYPYYYPYO",
    "OYYOOOYYO",
    "OYYYYYYYO",
    ".OOOOOOO.",
  ],
};
