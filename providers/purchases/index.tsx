import { createContext, useContext, useMemo } from "react";
import { MockPurchases } from "./mock";
import type { PurchasesGateway } from "./types";

const Ctx = createContext<PurchasesGateway | null>(null);

/**
 * Selects the purchases implementation. Always the mock for now — the
 * RevenueCat adapter is added in the EAS phase (see HANDOFF.md cutover
 * checklist) and chosen here when running in a dev build with an API key.
 * The adapter file must NOT exist in the tree until then, or Metro would
 * bundle the native module and crash Expo Go.
 */
export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const gateway = useMemo<PurchasesGateway>(() => new MockPurchases(), []);
  return <Ctx.Provider value={gateway}>{children}</Ctx.Provider>;
}

export function usePurchases() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePurchases outside provider");
  return ctx;
}
