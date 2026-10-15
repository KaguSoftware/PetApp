import type { ReactNode } from 'react';

export type MascotMood =
  | 'happy'
  | 'content'
  | 'hungry'
  | 'thirsty'
  | 'restless'
  | 'sleepy'
  | 'grumpy';

export type MascotReactionType = 'eat' | 'drink' | 'bounce' | 'love' | 'wiggle';

export interface MascotReaction {
  type: MascotReactionType;
  /** Change this number to (re)play the reaction. The first value seen on mount does not play. */
  key: number;
}

export type SpeciesKey = 'dog' | 'cat' | 'critter';

export interface MascotProps {
  /** "dog" | "cat" get dedicated art; anything else gets the generic critter. */
  species: string;
  mood?: MascotMood;
  reaction?: MascotReaction;
  /** Rendered square size in px. */
  size?: number;
  /** Fur colour as #rgb / #rrggbb. Shades are derived automatically. */
  tint?: string;
  /** Show the little thought bubble (bowl / leash) for hungry and restless moods. */
  showThought?: boolean;
  /** false = no idle loops (same as reduce motion). */
  animated?: boolean;
  accessibilityLabel?: string;
  accessory?: never;
}

export interface MascotStageProps extends Omit<MascotProps, 'accessory'> {
  /** Pastel room colour. */
  background?: string;
  /** Rug colour, or false to hide the rug. */
  rug?: string | false;
  height?: number;
  bubble?: ReactNode;
  children?: ReactNode;
}

export const MASCOT_MOODS: readonly MascotMood[] = [
  'happy',
  'content',
  'hungry',
  'thirsty',
  'restless',
  'sleepy',
  'grumpy',
];

export const MASCOT_REACTIONS: readonly MascotReactionType[] = [
  'eat',
  'drink',
  'bounce',
  'love',
  'wiggle',
];

export function speciesKey(species: string): SpeciesKey {
  const s = species.trim().toLowerCase();
  if (s === 'dog' || s === 'puppy' || s === 'canine') return 'dog';
  if (s === 'cat' || s === 'kitten' || s === 'feline') return 'cat';
  return 'critter';
}
