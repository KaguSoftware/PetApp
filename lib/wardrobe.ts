// The Pets tab's document model — pure, no React, no store.
//
// The tab is a wardrobe, so this file answers a wardrobe's questions: what fits
// this animal, what it already has, what it has on, and what is still out of
// reach. Nothing here knows about coins beyond comparing two numbers, and
// nothing here decides anything the store hasn't already decided — `buyCosmetic`
// owns affordability at write time; this only says what to draw.

import { COSMETICS, cosmetic, type Cosmetic, type CosmeticSlot, type Pet } from "@/lib/data";

/**
 * The slots, head down. The hint is not decoration: it is what the chapter's
 * rule carries when the slot is empty, so a slot with nothing on says what
 * belongs in it rather than reading as a gap.
 */
const SLOTS: { slot: CosmeticSlot; label: string; hint: string }[] = [
  { slot: "head", label: "Head", hint: "hats & headwear" },
  { slot: "face", label: "Face", hint: "glasses & shades" },
  { slot: "neck", label: "Neck", hint: "collars & scarves" },
  { slot: "body", label: "Body", hint: "outfits & capes" },
];

export interface WardrobeItem {
  cosmetic: Cosmetic;
  owned: boolean;
  worn: boolean;
  /** Only meaningful when `owned` is false. */
  affordable: boolean;
}

export interface WardrobeSlot {
  slot: CosmeticSlot;
  label: string;
  /** What is on right now, or the hint for what belongs here. */
  value: string;
  /** True when `value` names a worn item rather than describing the slot. */
  filled: boolean;
  items: WardrobeItem[];
}

export interface Wardrobe {
  /** The page's one sentence: where coins come from, and what is in reach. */
  standfirst: string;
  /** Breed and the two counts this page is actually about. */
  identity: string;
  slots: WardrobeSlot[];
}

/** Items this animal can actually wear — gender-restricted pieces drop out, and
 *  a pet with no gender recorded sees only the unrestricted ones. */
function eligible(pet: Pet): Cosmetic[] {
  return COSMETICS.filter((c) => !c.restrictGender || c.restrictGender === pet.gender);
}

export function wardrobeFor(pet: Pet, coins: number): Wardrobe {
  const all = eligible(pet);
  const items: WardrobeItem[] = all.map((c) => ({
    cosmetic: c,
    owned: pet.owned.includes(c.id),
    worn: pet.equipped[c.slot] === c.id,
    affordable: coins >= c.price,
  }));

  const ownedCount = items.filter((i) => i.owned).length;
  const wornCount = items.filter((i) => i.worn).length;
  const unowned = items.filter((i) => !i.owned);
  const affordable = unowned.filter((i) => i.affordable);

  const standfirst =
    unowned.length === 0
      ? `${pet.name} owns every piece in the shop. Mix and match.`
      : affordable.length > 0
        ? `Logging care earns coins. ${affordable.length} of the ${unowned.length} pieces left ${
            affordable.length === 1 ? "is" : "are"
          } within reach.`
        : // The useful version of "you can't afford anything": the exact gap.
          `Logging care earns coins. The cheapest piece left is ${Math.min(
            ...unowned.map((i) => i.cosmetic.price)
          )}, which is ${Math.min(...unowned.map((i) => i.cosmetic.price)) - coins} more than the jar holds.`;

  const identity = `${pet.breed} · owns ${ownedCount} of ${items.length} · ${
    wornCount === 0 ? "wearing nothing" : `wearing ${wornCount}`
  }`;

  const slots: WardrobeSlot[] = SLOTS.map((s) => {
    const slotItems = items.filter((i) => i.cosmetic.slot === s.slot);
    const wornId = pet.equipped[s.slot];
    const wornItem = wornId ? cosmetic(wornId) : undefined;
    return {
      slot: s.slot,
      label: s.label,
      value: wornItem ? wornItem.name : s.hint,
      filled: wornItem != null,
      items: slotItems,
    };
  }).filter((s) => s.items.length > 0);

  return { standfirst, identity, slots };
}
