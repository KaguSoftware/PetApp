import type { Sprite } from "./PixelSprite";

/*
 * Pixel cosmetics, authored to layer over the 16-wide pet sprite.
 * Each entry has the sprite + placement (relative to a 16px pet grid) so the
 * same data drives both the dress-up stage and the small avatar badge.
 * . = transparent.
 */
export type Placement = { left: number; top: number; widthFrac: number };

export interface CosmeticSprite {
  sprite: Sprite;
  /** placement as fractions of the pet box: left/top of the sprite's top-left */
  place: Placement;
  /**
   * Per-species override. The cat and dog sprites do not share facial geometry
   * — the cat's eyes sit on rows 7-8 spanning cols 3-12 (wide-set, two rows
   * tall), the dog's on row 7 spanning cols 3-10 — so a single placement can't
   * sit correctly on both. Only face items need this today.
   */
  placeBySpecies?: Partial<Record<"cat" | "dog", Placement>>;
}

/** The placement to use for a given species, falling back to the shared one. */
export function placementFor(cos: CosmeticSprite, species: "cat" | "dog"): Placement {
  return cos.placeBySpecies?.[species] ?? cos.place;
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
  // Face items are authored on a 9-wide grid so each lens is 4px across — at
  // 7 wide the lenses rendered as 2px specks that read as smudges, not glasses.
  // The cat's eyes span cols 3-12 of 16 (rows 7-8), so the frame covers the
  // full width of both eyes; the dog's are narrower and one row higher.
  sunglasses: {
    place: { left: 0.125, top: 0.4, widthFrac: 0.75 },
    placeBySpecies: {
      cat: { left: 0.125, top: 0.395, widthFrac: 0.75 },
      dog: { left: 0.135, top: 0.35, widthFrac: 0.72 },
    },
    sprite: P(
      ["BBBB.BBBB", "BBBB.BBBB", "BBBBBBBBB", ".B.....B."],
      { B: "#1c1c26" }
    ),
  },
  glasses: {
    place: { left: 0.125, top: 0.4, widthFrac: 0.75 },
    placeBySpecies: {
      cat: { left: 0.125, top: 0.395, widthFrac: 0.75 },
      dog: { left: 0.135, top: 0.35, widthFrac: 0.72 },
    },
    sprite: P(
      ["OOOO.OOOO", "O..O.O..O", "OOOO.OOOO", ".O.....O."],
      { O: "#3a3a48" }
    ),
  },
  monocle: {
    place: { left: 0.5, top: 0.4, widthFrac: 0.3 },
    placeBySpecies: {
      cat: { left: 0.56, top: 0.4, widthFrac: 0.3 },
      dog: { left: 0.5, top: 0.36, widthFrac: 0.28 },
    },
    sprite: P(
      ["GGGG", "G..G", "GGGG", "..C."],
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
