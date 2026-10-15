import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { usePets, type Pet } from "@/data";

const KEY = "petpal.home.petId";

let current: string | null = null;
let loadStarted = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function load() {
  if (loadStarted) return;
  loadStarted = true;
  AsyncStorage.getItem(KEY)
    .then((v) => {
      if (v && current === null) {
        current = v;
        emit();
      }
    })
    .catch(() => {
      // storage unavailable: the selection just won't persist
    });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** The pet shown on Home (persisted). Falls back to the first pet when unset or stale. */
export function useSelectedPet(): { pet: Pet | undefined; pets: Pet[]; select: (id: string) => void } {
  useEffect(load, []);
  const id = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
  const pets = usePets();
  const select = useCallback((next: string) => {
    current = next;
    emit();
    AsyncStorage.setItem(KEY, next).catch(() => {
      // storage unavailable: the selection just won't persist
    });
  }, []);
  const pet = pets.find((p) => p.id === id) ?? pets[0];
  return { pet, pets, select };
}
