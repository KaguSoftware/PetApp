import Constants from "expo-constants";
import { createContext, useContext, useEffect, useMemo } from "react";
import { useSession } from "@/providers/session";
import { MockPurchases } from "./mock";
import type { PurchasesGateway } from "./types";

const Ctx = createContext<PurchasesGateway | null>(null);

/**
 * Picks the purchases implementation at RUNTIME.
 *
 * react-native-purchases is a native module: it cannot load in Expo Go, and a
 * static `import` of the adapter would make Metro bundle it there and crash on
 * startup. Hence the require() behind the ownership check — the adapter module
 * is only ever evaluated in a real/dev build.
 *
 * Without an API key for the current platform we also stay on the mock, so the
 * app works before the RevenueCat dashboard is set up. See the EXPO_PUBLIC_RC_*
 * entries in .env and the RevenueCat section of HANDOFF.md.
 */
function selectGateway(): PurchasesGateway {
  if (Constants.appOwnership === "expo") return new MockPurchases();
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("./revenuecat") as typeof import("./revenuecat");
    if (!mod.RC_API_KEY) return new MockPurchases();
    return new mod.RevenueCatPurchases();
  } catch (e) {
    // Never let a purchases problem take the whole app down.
    console.warn("[petpal] RevenueCat unavailable, using the mock gateway:", e);
    return new MockPurchases();
  }
}

export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const gateway = useMemo<PurchasesGateway>(() => selectGateway(), []);
  const { session } = useSession();
  const userId = session?.user?.id;

  // RevenueCat's app_user_id MUST be the Supabase user id — the rc-webhook
  // looks the buyer up by it to decide which household to credit.
  useEffect(() => {
    if (!userId) return;
    gateway.configure(userId).catch((e) => console.warn("[petpal] purchases configure failed:", e));
  }, [gateway, userId]);

  return <Ctx.Provider value={gateway}>{children}</Ctx.Provider>;
}

export function usePurchases() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePurchases outside provider");
  return ctx;
}
