/**
 * Purchases abstraction. Expo Go cannot load react-native-purchases, so the
 * app talks to this interface only. `MockPurchases` implements it now
 * (instant unlock, mirroring the web demo); a RevenueCat adapter file is
 * added in the EAS phase and selected at runtime in a dev build.
 * The shared source of truth for the entitlement stays `households.premium`
 * in Supabase — the same flag the web demo reads.
 */
export interface PurchasePackage {
  id: string;
  title: string;
  priceLabel: string;
  period: "monthly" | "annual";
}

export interface EntitlementState {
  plusActive: boolean;
  /** Where the entitlement came from (mock now, revenuecat later). */
  source: "mock" | "revenuecat" | "none";
}

export interface PurchasesGateway {
  configure(userId: string): Promise<void>;
  getOfferings(): Promise<PurchasePackage[]>;
  purchase(pkgId: string): Promise<EntitlementState>;
  restore(): Promise<EntitlementState>;
}
