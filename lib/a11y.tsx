import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AccessibilityInfo } from "react-native";

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
export type A11yPrefs = { reduceMotion: boolean; reduceTransparency: boolean; haptics: boolean };

const KEY = "petpal.a11y";
const DEFAULT: A11yPrefs = { reduceMotion: false, reduceTransparency: false, haptics: true };

const listeners = new Set<() => void>();
let current: A11yPrefs = DEFAULT;
let loadStarted = false;

/** Lazily hydrate from AsyncStorage on the first hook mount. */
function load(): void {
  if (loadStarted) return;
  loadStarted = true;
  // AsyncStorage touches `window` on web; skip during the Node SSR pass.
  if (typeof window === "undefined") return;
  AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (!raw) return;
      try {
        const p = JSON.parse(raw) as Partial<A11yPrefs>;
        current = {
          reduceMotion: !!p.reduceMotion,
          reduceTransparency: !!p.reduceTransparency,
          haptics: p.haptics ?? true,
        };
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
  if (typeof window === "undefined") return;
  AsyncStorage.setItem(KEY, JSON.stringify(current)).catch(() => {
    // storage unavailable — prefs just won't persist
  });
}

export function useA11yPrefs() {
  useEffect(load, []);
  const prefs = useSyncExternalStore(subscribe, getSnapshot);
  return {
    reduceMotion: prefs.reduceMotion,
    reduceTransparency: prefs.reduceTransparency,
    haptics: prefs.haptics,
    setReduceMotion: (v: boolean) => set({ reduceMotion: v }),
    setReduceTransparency: (v: boolean) => set({ reduceTransparency: v }),
    setHaptics: (v: boolean) => set({ haptics: v }),
  };
}

/**
 * The effective "reduce motion" signal for animation code: true when EITHER the
 * in-app pref OR the operating system's Reduce Motion setting is on. Read this
 * from any component that plays a non-essential animation.
 */
export function useReduceMotion(): boolean {
  useEffect(load, []);
  const prefs = useSyncExternalStore(subscribe, getSnapshot);
  const [osReduce, setOsReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) setOsReduce(v);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setOsReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return prefs.reduceMotion || osReduce;
}

/** Non-hook read of the haptics pref for imperative call sites. */
export function hapticsEnabled(): boolean {
  return current.haptics;
}
