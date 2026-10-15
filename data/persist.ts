import { cache, type TableName, type Tables } from "./cache";
import { showError } from "./toasts";

type DbResult = { error: { message?: string; code?: string } | null };
export type DbOp = () => PromiseLike<DbResult>;
export type Outcome = { ok: true } | { ok: false; error: unknown };

/** The one place that turns `{error}` results AND thrown/rejected promises into an Outcome. */
export async function attempt(op: DbOp): Promise<Outcome> {
  try {
    const { error } = await op();
    if (!error) return { ok: true };
    if (__DEV__) console.warn("[data] write failed:", error.code, error.message);
    return { ok: false, error };
  } catch (error) {
    if (__DEV__) console.warn("[data] write threw:", error);
    return { ok: false, error };
  }
}

export class MutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MutationError";
  }
}

// Writes to the same row id run strictly in order (insert -> update -> delete),
// so an undo can never overtake the insert it undoes.
const chains = new Map<string, Promise<unknown>>();

// `after` = parent rows (pet, med) whose own writes must land first (foreign keys).
function enqueue(id: string, op: DbOp, after: string[] = []): Promise<Outcome> {
  const prev = Promise.all([chains.get(id), ...after.map(settled)]);
  cache.markPending(id);
  const run = prev.then(() => attempt(op));
  const tail = run.finally(() => {
    cache.unmarkPending(id);
    if (chains.get(id) === tail) chains.delete(id);
  });
  chains.set(id, tail);
  return run;
}

/** Resolves once every queued write for this id has settled. */
export function settled(id: string): Promise<unknown> {
  return chains.get(id) ?? Promise.resolve();
}

/**
 * Insert the row locally (synchronously), write it after any pending write for the
 * ids in `after`, and on failure remove ONLY that row. Throws after toasting.
 */
export async function optimisticInsert<K extends TableName>(
  table: K,
  row: Tables[K],
  op: DbOp,
  errorText: string,
  after: string[] = []
): Promise<Tables[K]> {
  const ep = cache.epoch();
  cache.upsert(table, row);
  const res = await enqueue(row.id, op, after);
  if (!res.ok) {
    if (cache.epoch() === ep) {
      cache.remove(table, row.id);
      showError(errorText);
    }
    throw new MutationError(errorText);
  }
  return row;
}

/** Patch one row; on failure only the fields this call touched are put back. Never throws. */
export async function optimisticUpdate<K extends TableName>(
  table: K,
  id: string,
  patch: Partial<Tables[K]>,
  op: DbOp,
  errorText: string
): Promise<boolean> {
  const ep = cache.epoch();
  const before = cache.get(table, id);
  if (!before) return false;
  cache.upsert(table, { ...before, ...patch });
  const res = await enqueue(id, op);
  if (res.ok) return true;
  if (cache.epoch() !== ep) return false;
  const current = cache.get(table, id);
  if (current) {
    // A key someone else changed since is theirs now; only undo what is still ours.
    const restored = { ...current };
    for (const key of Object.keys(patch) as (keyof Tables[K])[]) if (current[key] === patch[key]) restored[key] = before[key];
    cache.upsert(table, restored);
  }
  showError(errorText);
  return false;
}

/** Remove locally, DELETE after any in-flight write for the id; on failure restore the row. Never throws. */
export async function optimisticDelete(table: TableName, id: string, op: DbOp, errorText: string): Promise<boolean> {
  const ep = cache.epoch();
  const before = cache.get(table, id);
  if (!before) return false;
  cache.remove(table, id);
  cache.tombstone(id);
  const res = await enqueue(id, op);
  if (res.ok) {
    if (cache.epoch() === ep) cache.releaseTombstone(id);
    return true;
  }
  cache.untombstone(id);
  if (cache.epoch() !== ep) return false;
  cache.upsert(table, before as never);
  showError(errorText);
  return false;
}
