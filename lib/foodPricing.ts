import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { FormatId } from "@/lib/nutrition";

/**
 * What the family pays for food, per pet, per format.
 *
 * Device-local (AsyncStorage), not Supabase, for the same reason the a11y prefs
 * in lib/a11y.tsx are: a price is what *this* person pays at *their* shop, in
 * their currency. Two members of one household in different countries would
 * otherwise overwrite each other with numbers that are both correct. Same
 * module-snapshot + `useSyncExternalStore` shape as lib/a11y.tsx so every
 * mounted hook stays in sync without threading a provider through.
 *
 * If this ever needs to be shared, it becomes a household column and a
 * migration — deliberately not today.
 */

/** One priced product: what a pack costs and how much food is in it. */
export interface FoodPrice {
  /** Price of the whole purchase, in `currency`. */
  price: number;
  /** Weight of ONE pack/tin, in grams. */
  packGrams: number;
  /** How many packs/tins in the purchase. A 12 × 85 g box is 85 / 12. */
  packCount: number;
  /** Optional kcal per 100 g, read off the bag. Unlocks the per-calorie compare. */
  kcalPer100g?: number;
  /** Free-text, e.g. "Royal Canin British Shorthair". */
  label?: string;
}

export interface FoodPricingPrefs {
  /** ISO 4217 code, e.g. "GBP". Shared across every pet — one wallet. */
  currency: string;
  /** petId → format → what they buy. */
  byPet: Record<string, Partial<Record<FormatId, FoodPrice>>>;
}

const KEY = "petpal.foodPricing";

/* ── Currency ──────────────────────────────────────────────────────────────── */

export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

/** Short list, biggest markets first, matching the tone of lib/countries.ts:
 *  reference data lives in the app rather than pulling a dependency in. */
export const CURRENCIES: CurrencyOption[] = [
  { code: "USD", symbol: "$", name: "US dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British pound" },
  { code: "CAD", symbol: "CA$", name: "Canadian dollar" },
  { code: "AUD", symbol: "A$", name: "Australian dollar" },
  { code: "JPY", symbol: "¥", name: "Japanese yen" },
  { code: "CHF", symbol: "CHF", name: "Swiss franc" },
  { code: "SEK", symbol: "kr", name: "Swedish krona" },
  { code: "NOK", symbol: "kr", name: "Norwegian krone" },
  { code: "DKK", symbol: "kr", name: "Danish krone" },
  { code: "PLN", symbol: "zł", name: "Polish złoty" },
  { code: "CZK", symbol: "Kč", name: "Czech koruna" },
  { code: "TRY", symbol: "₺", name: "Turkish lira" },
  { code: "AED", symbol: "AED", name: "UAE dirham" },
  { code: "SAR", symbol: "SAR", name: "Saudi riyal" },
  { code: "INR", symbol: "₹", name: "Indian rupee" },
  { code: "BRL", symbol: "R$", name: "Brazilian real" },
  { code: "MXN", symbol: "MX$", name: "Mexican peso" },
  { code: "ZAR", symbol: "R", name: "South African rand" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand dollar" },
  { code: "SGD", symbol: "S$", name: "Singapore dollar" },
  { code: "KRW", symbol: "₩", name: "South Korean won" },
];

/** Region → currency for the regions the list above covers. */
const REGION_CURRENCY: Record<string, string> = {
  US: "USD", CA: "CAD", GB: "GBP", AU: "AUD", NZ: "NZD", JP: "JPY", CH: "CHF",
  SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", CZ: "CZK", TR: "TRY", AE: "AED",
  SA: "SAR", IN: "INR", BR: "BRL", MX: "MXN", ZA: "ZAR", SG: "SGD", KR: "KRW",
  DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", BE: "EUR", AT: "EUR",
  IE: "EUR", PT: "EUR", FI: "EUR", GR: "EUR", LU: "EUR",
};

/**
 * Best guess at the user's currency from the device locale, so the first thing
 * they see is already right most of the time. Falls back to USD.
 *
 * Wrapped in try/catch: Intl is present in Hermes on both platforms in SDK 54,
 * but a locale string without a region ("en") simply has nothing to read.
 */
function guessCurrency(): string {
  try {
    const locale = new Intl.NumberFormat().resolvedOptions().locale;
    const region = locale.split("-").find((part) => /^[A-Z]{2}$/.test(part));
    if (region && REGION_CURRENCY[region]) return REGION_CURRENCY[region];
  } catch {
    // No Intl or no region — USD it is.
  }
  return "USD";
}

export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

/** Currencies conventionally written without minor units — a "¥1,240.00" price
 *  reads as broken to anyone who uses one. */
const ZERO_DECIMAL = new Set(["JPY", "KRW"]);

export function currencyDecimals(code: string): number {
  return ZERO_DECIMAL.has(code) ? 0 : 2;
}

/**
 * Money, formatted for display. Grouping via `toLocaleString` so a yearly figure
 * doesn't run together, symbol prefixed rather than going through
 * `style: "currency"` — that path renders codes like "SAR 12.00" on some
 * platforms and "﷼ 12.00" on others, which makes the layout unpredictable.
 */
export function formatMoney(value: number, code: string, opts?: { decimals?: number }): string {
  const decimals = opts?.decimals ?? currencyDecimals(code);
  const rounded = Number.isFinite(value) ? value : 0;
  return `${currencySymbol(code)}${rounded.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/* ── Store ─────────────────────────────────────────────────────────────────── */

const listeners = new Set<() => void>();
let current: FoodPricingPrefs = { currency: guessCurrency(), byPet: {} };
let loadStarted = false;

function load(): void {
  if (loadStarted) return;
  loadStarted = true;
  // AsyncStorage touches `window`; skip during the Node SSR pass (web build).
  if (typeof window === "undefined") return;
  AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (!raw) return;
      try {
        const p = JSON.parse(raw) as Partial<FoodPricingPrefs>;
        current = {
          currency: typeof p.currency === "string" ? p.currency : current.currency,
          byPet: p.byPet && typeof p.byPet === "object" ? p.byPet : {},
        };
        listeners.forEach((l) => l());
      } catch {
        // corrupt value — keep defaults
      }
    })
    .catch(() => {
      // storage unavailable — prices just won't persist
    });
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): FoodPricingPrefs {
  return current;
}

function commit(next: FoodPricingPrefs): void {
  current = next;
  listeners.forEach((l) => l());
  if (typeof window === "undefined") return;
  AsyncStorage.setItem(KEY, JSON.stringify(current)).catch(() => {
    // storage unavailable — prices just won't persist
  });
}

export function useFoodPricing(petId: string) {
  useEffect(load, []);
  const prefs = useSyncExternalStore(subscribe, getSnapshot);
  const prices = prefs.byPet[petId] ?? {};

  const setPrice = useCallback(
    (format: FormatId, price: FoodPrice | null) => {
      const forPet = { ...(current.byPet[petId] ?? {}) };
      if (price) forPet[format] = price;
      else delete forPet[format];
      commit({ ...current, byPet: { ...current.byPet, [petId]: forPet } });
    },
    [petId],
  );

  const setCurrency = useCallback((code: string) => {
    commit({ ...current, currency: code });
  }, []);

  return { currency: prefs.currency, prices, setPrice, setCurrency };
}
