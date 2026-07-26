import { Platform } from "react-native";
import Purchases, { LOG_LEVEL, type PurchasesPackage } from "react-native-purchases";
import { COIN_PACKS, PLUS_MONTHLY_ID } from "./products";
import type { EntitlementState, PurchasePackage, PurchasesGateway } from "./types";

/**
 * The real RevenueCat gateway.
 *
 * This module imports the native module at the top level, so it must only ever
 * be require()'d from providers/purchases/index.tsx AFTER the Expo Go check —
 * a static import anywhere else would make Metro bundle it into the Expo Go
 * build and crash on startup.
 *
 * Entitlement identifier configured in the RevenueCat dashboard.
 */
const PLUS_ENTITLEMENT = "plus";

export const RC_API_KEY =
  Platform.OS === "ios" ? process.env.EXPO_PUBLIC_RC_IOS_KEY : process.env.EXPO_PUBLIC_RC_ANDROID_KEY;

const COIN_PACK_IDS = new Set(COIN_PACKS.map((p) => p.id));

/** RevenueCat prefixes StoreKit ids on some platforms; match on the suffix. */
function productIdOf(pkg: PurchasesPackage): string {
  return pkg.product.identifier.replace(/:.*$/, "");
}

export class RevenueCatPurchases implements PurchasesGateway {
  readonly live = true;
  private configured = false;

  async configure(userId: string): Promise<void> {
    if (this.configured || !RC_API_KEY) return;
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN);
    // appUserId MUST be the Supabase user id: the rc-webhook looks the buyer up
    // by `event.app_user_id` to find which household to credit.
    await Purchases.configure({ apiKey: RC_API_KEY, appUserID: userId });
    this.configured = true;
  }

  async getOfferings(): Promise<PurchasePackage[]> {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return [];
    return current.availablePackages.map((pkg) => {
      const id = productIdOf(pkg);
      return {
        id,
        title: pkg.product.title,
        // Localised, tax/currency-correct string from the store itself.
        priceLabel: pkg.product.priceString,
        period: id === PLUS_MONTHLY_ID ? ("monthly" as const) : undefined,
        kind: COIN_PACK_IDS.has(id) ? ("consumable" as const) : ("subscription" as const),
      };
    });
  }

  async purchase(productId: string): Promise<EntitlementState> {
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages.find((p) => productIdOf(p) === productId);
      if (!pkg) return { plusActive: false, source: "none", error: "That item isn't available right now." };
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return {
        plusActive: !!customerInfo.entitlements.active[PLUS_ENTITLEMENT],
        source: "revenuecat",
      };
    } catch (e) {
      // userCancelled is a normal outcome, not a failure to report.
      if ((e as { userCancelled?: boolean })?.userCancelled) {
        return { plusActive: false, source: "none", cancelled: true };
      }
      const message = (e as { message?: string })?.message;
      console.warn("[petpal] purchase failed:", e);
      return { plusActive: false, source: "none", error: message ?? "The purchase didn't go through." };
    }
  }

  async restore(): Promise<EntitlementState> {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const plusActive = !!customerInfo.entitlements.active[PLUS_ENTITLEMENT];
      return { plusActive, source: plusActive ? "revenuecat" : "none" };
    } catch (e) {
      console.warn("[petpal] restore failed:", e);
      return { plusActive: false, source: "none", error: "Couldn't restore purchases." };
    }
  }
}
