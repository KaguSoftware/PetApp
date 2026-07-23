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
    place: { left: 0.22, top: -0.27, widthFrac: 0.56 },
    sprite: P(
      ["OOOOOO", "OBBBBO", "OBBBBO", "OBBBBO", "RRRRRR", "OOOOOO"],
      { O: "#1c1c26", B: "#33333f", R: "#d23b57" }
    ),
  },
  crown: {
    place: { left: 0.24, top: -0.18, widthFrac: 0.52 },
    sprite: P(
      ["G.G.G", "GGGGG", "GJGJG", "GGGGG"],
      { G: "#f5c542", J: "#e0443f" }
    ),
  },
  cap: {
    place: { left: 0.175, top: -0.12, widthFrac: 0.65 },
    sprite: P(
      [".RRRR..", "RRRRRR.", "RRRRRRR", "..WWWWW"],
      { R: "#2f7de0", W: "#1b4e93" }
    ),
  },
  party: {
    place: { left: 0.29, top: -0.27, widthFrac: 0.42 },
    sprite: P(
      ["..Y..", "..P..", ".PPP.", ".GGG.", "BBBBB"],
      { Y: "#f5c542", P: "#e0443f", G: "#3fb56b", B: "#2f7de0" }
    ),
  },
  santa: {
    place: { left: 0.2, top: -0.2, widthFrac: 0.6 },
    // All rows must be equal length or PixelSprite (which reads row[0] for width)
    // clips the wider brim — pad the hat body to the brim's 6-wide grid.
    sprite: P(
      ["...WW.", "RRRRW.", "RRRRR.", "WWWWWW"],
      { R: "#d23b57", W: "#f4f4f4" }
    ),
  },

  /* ---------- FACE ---------- */
  // Face items are authored on a 9-wide grid: the two 4px lens frames are
  // centred at native cols 1.5 and 6.5 (5 apart). Placement is derived so those
  // lens centres land on the eye pixels (both renderers scale the sprite to
  // widthFrac*16 wide, so a source col sx maps to grid col left*16 + sx*boxW/9):
  //   CAT eyes (petSprites.ts) sit cols 3-4 & 11-12, rows 7-8 → centres x=4,12;
  //     DOG eyes sit col 3 & col 10, row 7 → centres x=3.5,10.5.
  // Eye-exact width was ~0.85/0.79, but that frame read too large, so widthFrac
  // is dialled to ~0.75 of it (0.64/0.59) — a smaller frame. `left` AND `top`
  // are recomputed from the eye-exact version so the frame's horizontal centre
  // (grid x≈8 cat / ≈7 dog) AND its lens-row centre (≈7.9 cat / ≈7.2 dog) are
  // preserved — it scales in place. At this size the fixed-spacing lenses land
  // a hair inside the wide-set cat eyes; widen the sprite's bridge if you want
  // them dead-centre at the smaller size.
  sunglasses: {
    place: { left: 0.213, top: 0.423, widthFrac: 0.64 },
    placeBySpecies: {
      cat: { left: 0.213, top: 0.423, widthFrac: 0.64 },
      dog: { left: 0.177, top: 0.382, widthFrac: 0.59 },
    },
    sprite: P(
      ["BBBB.BBBB", "BBBB.BBBB", "BBBBBBBBB", ".B.....B."],
      { B: "#1c1c26" }
    ),
  },
  glasses: {
    place: { left: 0.213, top: 0.423, widthFrac: 0.64 },
    placeBySpecies: {
      cat: { left: 0.213, top: 0.423, widthFrac: 0.64 },
      dog: { left: 0.177, top: 0.382, widthFrac: 0.59 },
    },
    sprite: P(
      ["OOOO.OOOO", "O..O.O..O", "OOOO.OOOO", ".O.....O."],
      { O: "#3a3a48" }
    ),
  },
  // Sits over one eye only — cat's right eye (cols 11-12), dog's single eye
  // (col 10) — sized to just frame it rather than span the whole face.
  monocle: {
    place: { left: 0.6, top: 0.3125, widthFrac: 0.25 },
    placeBySpecies: {
      cat: { left: 0.6, top: 0.3125, widthFrac: 0.25 },
      dog: { left: 0.5, top: 0.3125, widthFrac: 0.25 },
    },
    sprite: P(
      ["GGGG", "G..G", "GGGG", "..C."],
      { G: "#c9a227", C: "#c9a227" }
    ),
  },

  /* ---------- NECK ---------- */
  bowtie: {
    place: { left: 0.4, top: 0.74, widthFrac: 0.21 },
    sprite: P(
      ["R.R", "RKR", "R.R"],
      { R: "#d23b57", K: "#8f2233" }
    ),
  },
  scarf: {
    place: { left: 0.14, top: 0.72, widthFrac: 0.72 },
    sprite: P(
      ["GGGGGGGGG", "GGGGGGGGG", "...GG...."],
      { G: "#3fb56b" }
    ),
  },
  medal: {
    place: { left: 0.36, top: 0.72, widthFrac: 0.28 },
    sprite: P(
      ["RR", "YY", "YY"],
      { R: "#2f7de0", Y: "#f5c542" }
    ),
  },

  /* ---------- BODY ---------- */
  tux: {
    place: { left: 0.19, top: 0.8, widthFrac: 0.62 },
    sprite: P(
      ["OWWWWWO", "OOWKWOO", "OOOWOOO"],
      { O: "#1c1c26", W: "#f4f4f4", K: "#d23b57" }
    ),
  },
  shirt: {
    place: { left: 0.19, top: 0.8, widthFrac: 0.62 },
    sprite: P(
      ["CYCYCYC", "YCYCYCY", "CYCYCYC"],
      { C: "#2fb5c9", Y: "#f5c542" }
    ),
  },
  cape: {
    place: { left: 0.11, top: 0.78, widthFrac: 0.78 },
    sprite: P(
      ["RRRRRRRRR", "RRRRRRRRR", ".RRRRRRR.", "..RRRRR.."],
      { R: "#d23b57" }
    ),
  },

  // Shop item (head slot, female-only) — sits beside the head rather than at
  // the neck like the plain "bowtie" item, since it's headwear-slotted.
  pinkBowtie: {
    place: { left: 0.02, top: 0.28, widthFrac: 0.3 },
    placeBySpecies: {
      cat: { left: 0.0, top: 0.26, widthFrac: 0.3 },
      dog: { left: 0.02, top: 0.24, widthFrac: 0.28 },
    },
    sprite: P(
      ["P.P", "PKP", "P.P"],
      { P: "#ff6fa5", K: "#c23f77" }
    ),
  },
};
