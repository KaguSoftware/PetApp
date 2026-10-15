import type { ComponentType } from 'react';
import type { FaceCfg } from '../face';
import type { Palette } from '../palette';

export interface PartProps {
  p: Palette;
}

/** A species is a handful of 200x200-viewBox SVG parts plus face placement. */
export interface SpeciesArt {
  face: FaceCfg;
  /** Tail rotation pivot (viewBox units), max sway in degrees, and base cycle ms. */
  tail: { pivot: readonly [number, number]; amp: number; ms: number };
  /** Does the body shake when restless (dogs, critters) instead of flicking a tail (cats)? */
  shakesWhenRestless: boolean;
  Tail: ComponentType<PartProps>;
  /** Body, belly, paws. */
  Body: ComponentType<PartProps>;
  /** Ears, head, muzzle, nose, cheeks, markings, whiskers. Eyes/mouth are layered on top. */
  Head: ComponentType<PartProps>;
}
