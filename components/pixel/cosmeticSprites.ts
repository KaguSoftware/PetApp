import type { Sprite } from "./PixelSprite";

/*
 * Pixel cosmetics, authored to layer over the 16-wide pet sprite.
 * Each entry has the sprite + placement (relative to a 16px pet grid) so the
 * same data drives both the dress-up stage and the small avatar badge.
 * . = transparent.
 */
export interface CosmeticSprite {
  sprite: Sprite;
  /** placement as fractions of the pet box: left/top of the sprite's top-left */
  place: { left: number; top: number; widthFrac: number };
}

const P = (rows: string[], palette: Record<string, string>): Sprite => ({ rows, palette });

export const COSMETIC_SPRITES: Record<string, CosmeticSprite> = {
  /* ---------- HEAD ---------- */
  tophat: {
    place: { left: 0.28, top: -0.18, widthFrac: 0.44 },
    sprite: P(
      ["OOOOOO", "OBBBBO", "OBBBBO", "OBBBBO", "RRRRRR", "OOOOOO"],
      { O: "#1c1c26", B: "#33333f", R: "#d23b57" }
    ),
  },
  crown: {
    place: { left: 0.3, top: -0.1, widthFrac: 0.4 },
    sprite: P(
      ["G.G.G", "GGGGG", "GJGJG", "GGGGG"],
      { G: "#f5c542", J: "#e0443f" }
    ),
  },
  cap: {
    place: { left: 0.24, top: -0.06, widthFrac: 0.52 },
    sprite: P(
      [".RRRR..", "RRRRRR.", "RRRRRRR", "..WWWWW"],
      { R: "#2f7de0", W: "#1b4e93" }
    ),
  },
  party: {
    place: { left: 0.34, top: -0.22, widthFrac: 0.32 },
    sprite: P(
      ["..Y..", "..P..", ".PPP.", ".GGG.", "BBBBB"],
      { Y: "#f5c542", P: "#e0443f", G: "#3fb56b", B: "#2f7de0" }
    ),
  },
  santa: {
    place: { left: 0.26, top: -0.12, widthFrac: 0.48 },
    // All rows must be equal length or PixelSprite (which reads row[0] for width)
    // clips the wider brim — pad the hat body to the brim's 6-wide grid.
    sprite: P(
      ["...WW.", "RRRRW.", "RRRRR.", "WWWWWW"],
      { R: "#d23b57", W: "#f4f4f4" }
    ),
  },

  /* ---------- FACE ---------- */
  sunglasses: {
    place: { left: 0.14, top: 0.42, widthFrac: 0.72 },
    sprite: P(
      ["BBB.BBB", "BBBBBBB", ".B...B."],
      { B: "#1c1c26" }
    ),
  },
  glasses: {
    place: { left: 0.14, top: 0.42, widthFrac: 0.72 },
    sprite: P(
      ["OOO.OOO", "O.O.O.O", "OOOOOOO"],
      { O: "#3a3a48" }
    ),
  },
  monocle: {
    place: { left: 0.46, top: 0.42, widthFrac: 0.32 },
    sprite: P(
      ["GGG", "G.G", "GGG", ".C."],
      { G: "#c9a227", C: "#c9a227" }
    ),
  },

  /* ---------- NECK ---------- */
  bowtie: {
    place: { left: 0.34, top: 0.74, widthFrac: 0.32 },
    sprite: P(
      ["R.R", "RKR", "R.R"],
      { R: "#d23b57", K: "#8f2233" }
    ),
  },
  scarf: {
    place: { left: 0.2, top: 0.72, widthFrac: 0.6 },
    sprite: P(
      ["GGGGGGGGG", "GGGGGGGGG", "...GG...."],
      { G: "#3fb56b" }
    ),
  },
  medal: {
    place: { left: 0.4, top: 0.72, widthFrac: 0.2 },
    sprite: P(
      ["RR", "YY", "YY"],
      { R: "#2f7de0", Y: "#f5c542" }
    ),
  },

  /* ---------- BODY ---------- */
  tux: {
    place: { left: 0.24, top: 0.8, widthFrac: 0.52 },
    sprite: P(
      ["OWWWWWO", "OOWKWOO", "OOOWOOO"],
      { O: "#1c1c26", W: "#f4f4f4", K: "#d23b57" }
    ),
  },
  shirt: {
    place: { left: 0.24, top: 0.8, widthFrac: 0.52 },
    sprite: P(
      ["CYCYCYC", "YCYCYCY", "CYCYCYC"],
      { C: "#2fb5c9", Y: "#f5c542" }
    ),
  },
  cape: {
    place: { left: 0.16, top: 0.78, widthFrac: 0.68 },
    sprite: P(
      ["RRRRRRRRR", "RRRRRRRRR", ".RRRRRRR.", "..RRRRR.."],
      { R: "#d23b57" }
    ),
  },
};
