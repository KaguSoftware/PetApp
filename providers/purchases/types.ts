/**
 * Purchases abstraction. Expo Go cannot load react-native-purchases, so the
 * app talks to this interface only. `MockPurchases` implements it now
 * (instant unlock, mirroring the web demo); a RevenueCat adapter file is
 * added in the EAS phase and selected at runtime in a dev build.
 * The shared source of truth for the entitlement stays `households.premium`
 * in Supabase — the same flag the web demo reads.
 */
export interface PurchasePackage {
  /** The STORE product identifier (see providers/purchases/products.ts). */
  id: string;
  title: string;
  /** Localised price straight from the store — never hardcoded. */
  priceLabel: string;
  /** Subscriptions carry a period; one-off coin packs don't. */
  period?: "monthly" | "annual";
  kind: "subscription" | "consumable";
}

export interface EntitlementState {
  plusActive: boolean;
  /** Where the entitlement came from (mock now, revenuecat later). */
  source: "mock" | "revenuecat" | "none";
  /** User backed out of the store sheet — not an error, show no message. */
  cancelled?: boolean;
  /** Something went wrong; already human-readable. */
  error?: string;
}

export interface PurchasesGateway {
  /** True when purchases can actually charge. False for the Expo Go mock. */
  readonly live: boolean;
  configure(userId: string): Promise<void>;
  getOfferings(): Promise<PurchasePackage[]>;
  purchase(productId: string): Promise<EntitlementState>;
  restore(): Promise<EntitlementState>;
}
