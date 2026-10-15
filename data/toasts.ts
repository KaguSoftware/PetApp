import { createStore, useStore } from "./store";

export interface Toast {
  id: string;
  kind: "info" | "error" | "undo";
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

const DURATION_MS = { info: 3500, error: 5000, undo: 6000 } as const;

const store = createStore<Toast[]>([]);
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let counter = 0;

export function useToasts(): Toast[] {
  return useStore(store);
}

export function showToast(t: Omit<Toast, "id">): string {
  const id = `toast-${++counter}`;
  store.set((list) => [...list, { ...t, id }]);
  timers.set(id, setTimeout(() => dismissToast(id), DURATION_MS[t.kind]));
  return id;
}

export function dismissToast(id: string): void {
  const timer = timers.get(id);
  if (timer) clearTimeout(timer);
  timers.delete(id);
  store.set((list) => list.filter((t) => t.id !== id));
}

export function showError(text: string): void {
  showToast({ kind: "error", text });
}

/** Sign-out / user switch: no toast or timer survives. */
export function clearToasts(): void {
  timers.forEach((t) => clearTimeout(t));
  timers.clear();
  store.set([]);
}
