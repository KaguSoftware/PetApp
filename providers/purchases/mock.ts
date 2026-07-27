import { COIN_PACKS, PLUS_MONTHLY_ID } from "./products";
import type { EntitlementState, PurchasePackage, PurchasesGateway } from "./types";

/**
 * Expo Go stand-in for RevenueCat — the native module can't load there.
 *
 * Prices are placeholders and clearly labelled as such by the UI (`live` is
 * false, so the coin screen keeps its honest "coming soon" behaviour rather
 * than faking a balance bump that wouldn't survive a reload). PetPal+ still
 * unlocks instantly, mirroring the web demo: the caller persists it through the
 * store (households.premium), which IS real.
 */
const OFFERINGS: PurchasePackage[] = [
  { id: PLUS_MONTHLY_ID, title: "PetPal+ Monthly", priceLabel: "$4.99/month", period: "monthly", kind: "subscription" },
  ...COIN_PACKS.map((p) => ({
    id: p.id,
    title: `${p.coins.toLocaleString()} coins`,
    priceLabel: "—",
    kind: "consumable" as const,
  })),
];

export class MockPurchases implements PurchasesGateway {
  readonly live = false;

  async configure(_userId: string): Promise<void> {}

  async getOfferings(): Promise<PurchasePackage[]> {
    return OFFERINGS;
  }

  async purchase(productId: string): Promise<EntitlementState> {
    await new Promise((r) => setTimeout(r, 800));
    // Only the subscription unlocks. Coins are granted server-side by the
    // RevenueCat webhook, which has nothing to react to here.
    return { plusActive: productId === PLUS_MONTHLY_ID, source: "mock" };
  }

  async restore(): Promise<EntitlementState> {
    return { plusActive: false, source: "none" };
  }

  /**
   * Expo Go has no real customerInfo to read, and this mock doesn't know the
   * store's `households.premium` flag — placeholder dates only, clearly a
   * 30-day window ending 30 days out, so the subscription page has something
   * sane to render while developing in Expo Go.
   */
  async getEntitlement(): Promise<EntitlementState> {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    return {
      plusActive: true,
      source: "mock",
      latestPurchaseDate: new Date(now - 30 * day).toISOString(),
      expirationDate: new Date(now + 30 * day).toISOString(),
      willRenew: true,
      productIdentifier: PLUS_MONTHLY_ID,
    };
  }
}
