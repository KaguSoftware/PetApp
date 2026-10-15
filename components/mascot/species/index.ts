import type { SpeciesKey } from '../types';
import { cat } from './cat';
import { critter } from './critter';
import { dog } from './dog';
import type { SpeciesArt } from './types';

export const SPECIES_ART: Record<SpeciesKey, SpeciesArt> = { dog, cat, critter };
export type { SpeciesArt } from './types';
