/**
 * THE product catalogue. These identifiers must match, exactly:
 *   - App Store Connect / Google Play Console product ids
 *   - the RevenueCat dashboard's products and their offering packages
 *   - COIN_PACK_COINS in supabase/functions/rc-webhook/index.ts, which is what
 *     actually credits the balance
 *
 * Coin amounts live on the SERVER (rc-webhook). The numbers here are display
 * only: a client that decided its own grant could mint currency.
 */

export const PLUS_MONTHLY_ID = "petpal_plus_monthly";

export interface CoinPackMeta {
  id: string;
  coins: number;
  bonus?: string;
  best?: boolean;
}

/** Ordered smallest → largest; the UI renders them in this order. */
export const COIN_PACKS: CoinPackMeta[] = [
  { id: "petpal_coins_500", coins: 500 },
  { id: "petpal_coins_1500", coins: 1500, bonus: "+10%" },
  { id: "petpal_coins_4000", coins: 4000, bonus: "+25%", best: true },
  { id: "petpal_coins_10000", coins: 10000, bonus: "+40%" },
];

export function coinPackMeta(productId: string): CoinPackMeta | undefined {
  return COIN_PACKS.find((p) => p.id === productId);
}
