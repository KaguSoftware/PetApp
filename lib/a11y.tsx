import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useSyncExternalStore } from "react";

/**
 * Device-local display accessibility preferences (Reduce Motion / Reduce
 * Transparency). Like the OS-level equivalents these belong to the *device*,
 * not the shared family data, so they persist to AsyncStorage instead of the
 * Supabase household store — the native mirror of the web's localStorage-backed
 * lib/a11y.
 *
 * Backed by useSyncExternalStore over a module-level snapshot so every mounted
 * hook stays in sync without a provider.
 */
export type A11yPrefs = { reduceMotion: boolean; reduceTransparency: boolean };

const KEY = "petpal.a11y";
const DEFAULT: A11yPrefs = { reduceMotion: false, reduceTransparency: false };

const listeners = new Set<() => void>();
let current: A11yPrefs = DEFAULT;
let loadStarted = false;

/** Lazily hydrate from AsyncStorage on the first hook mount. */
function load(): void {
  if (loadStarted) return;
  loadStarted = true;
  AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (!raw) return;
      try {
        const p = JSON.parse(raw) as Partial<A11yPrefs>;
        current = { reduceMotion: !!p.reduceMotion, reduceTransparency: !!p.reduceTransparency };
        listeners.forEach((l) => l());
      } catch {
        // corrupt value — keep defaults
      }
    })
    .catch(() => {
      // storage unavailable — prefs just won't persist
    });
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): A11yPrefs {
  return current;
}

function set(next: Partial<A11yPrefs>): void {
  current = { ...current, ...next };
  listeners.forEach((l) => l());
  AsyncStorage.setItem(KEY, JSON.stringify(current)).catch(() => {
    // storage unavailable — prefs just won't persist
  });
}

// SCOPE(later): motion/transparency not yet consumed app-wide
export function useA11yPrefs() {
  useEffect(load, []);
  const prefs = useSyncExternalStore(subscribe, getSnapshot);
  return {
    reduceMotion: prefs.reduceMotion,
    reduceTransparency: prefs.reduceTransparency,
    setReduceMotion: (v: boolean) => set({ reduceMotion: v }),
    setReduceTransparency: (v: boolean) => set({ reduceTransparency: v }),
  };
}
