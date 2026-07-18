import type { EntitlementState, PurchasePackage, PurchasesGateway } from "./types";

const OFFERINGS: PurchasePackage[] = [
  { id: "petpal_plus_monthly", title: "PetPal+ Monthly", priceLabel: "$4.99/month", period: "monthly" },
];

/**
 * Expo Go stand-in for RevenueCat: resolves after a short delay so the UI's
 * loading states are exercised, then reports the entitlement as active. The
 * caller persists it via the store (households.premium), exactly like the
 * web demo's instant unlock.
 */
export class MockPurchases implements PurchasesGateway {
  async configure(_userId: string): Promise<void> {}

  async getOfferings(): Promise<PurchasePackage[]> {
    return OFFERINGS;
  }

  async purchase(_pkgId: string): Promise<EntitlementState> {
    await new Promise((r) => setTimeout(r, 800));
    return { plusActive: true, source: "mock" };
  }

  async restore(): Promise<EntitlementState> {
    return { plusActive: false, source: "none" };
  }
}
