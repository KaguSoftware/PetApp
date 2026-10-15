import { cache } from "../cache";
import { optimisticDelete, optimisticInsert, optimisticUpdate } from "../persist";
import { clearToasts } from "../toasts";
import type { CareLog } from "../types";

const log = (id: string, extra: Partial<CareLog> = {}): CareLog => ({
  id,
  petId: "p",
  memberId: null,
  type: "fed",
  ts: 1,
  note: null,
  grams: null,
  medId: null,
  durationMinutes: null,
  ...extra,
});

const ok = () => Promise.resolve({ error: null });
const fail = () => Promise.resolve({ error: { message: "boom", code: "X" } });
const deferred = () => {
  let resolve!: (v: { error: null }) => void;
  const promise = new Promise<{ error: null }>((r) => (resolve = r));
  return { promise, resolve };
};

beforeEach(() => {
  cache.reset();
  clearToasts();
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => {
  clearToasts();
  jest.restoreAllMocks();
});

describe("optimisticInsert", () => {
  it("shows the row immediately and keeps it on success", async () => {
    const d = deferred();
    const p = optimisticInsert("activities", log("a"), () => d.promise, "err");
    expect(cache.get("activities", "a")).toBeDefined();
    d.resolve({ error: null });
    await p;
    expect(cache.get("activities", "a")).toBeDefined();
  });

  it("rolls back only the failed row, leaving a concurrent log alone", async () => {
    const first = optimisticInsert("activities", log("a"), fail, "err");
    const second = optimisticInsert("activities", log("b"), ok, "err");
    await expect(first).rejects.toThrow("err");
    await second;
    expect(cache.get("activities", "a")).toBeUndefined();
    expect(cache.get("activities", "b")).toBeDefined();
  });

  it("treats a rejected promise like an {error} result", async () => {
    await expect(optimisticInsert("activities", log("a"), () => Promise.reject(new Error("net")), "err")).rejects.toThrow();
    expect(cache.get("activities", "a")).toBeUndefined();
  });
});

describe("optimisticUpdate", () => {
  it("restores only the touched fields on failure", async () => {
    cache.upsert("activities", log("a", { note: "old", grams: 10 }));
    const update = optimisticUpdate("activities", "a", { note: "new" }, fail, "err");
    // a concurrent edit to another field of the same row survives the rollback
    cache.upsert("activities", { ...cache.get("activities", "a")!, grams: 99 });
    await update;
    expect(cache.get("activities", "a")).toMatchObject({ note: "old", grams: 99 });
  });
});

describe("optimisticDelete", () => {
  it("waits for the in-flight insert before issuing DELETE", async () => {
    const insert = deferred();
    const order: string[] = [];
    void optimisticInsert(
      "activities",
      log("a"),
      () => {
        order.push("insert");
        return insert.promise;
      },
      "err"
    );
    const del = optimisticDelete(
      "activities",
      "a",
      () => {
        order.push("delete");
        return ok();
      },
      "err"
    );
    expect(cache.get("activities", "a")).toBeUndefined();
    await new Promise((r) => setTimeout(r, 0));
    expect(order).toEqual(["insert"]);
    insert.resolve({ error: null });
    await del;
    expect(order).toEqual(["insert", "delete"]);
  });

  it("restores the row when DELETE fails", async () => {
    cache.upsert("activities", log("a"));
    expect(await optimisticDelete("activities", "a", fail, "err")).toBe(false);
    expect(cache.get("activities", "a")).toBeDefined();
  });

  it("ignores realtime echoes for a row being deleted", async () => {
    cache.upsert("activities", log("a"));
    const d = deferred();
    const del = optimisticDelete("activities", "a", () => d.promise, "err");
    cache.mergeRemote("activities", log("a"));
    expect(cache.get("activities", "a")).toBeUndefined();
    d.resolve({ error: null });
    await del;
  });
});

describe("cache lifecycle", () => {
  it("drops results of writes that settle after a reset (sign-out)", async () => {
    const d = deferred();
    const p = optimisticInsert("activities", log("a"), () => d.promise, "err").catch(() => undefined);
    cache.reset();
    d.resolve({ error: null });
    await p;
    expect(cache.all("activities")).toEqual([]);
  });

  it("replaceAll keeps rows with writes in flight", () => {
    const d = deferred();
    void optimisticInsert("activities", log("local"), () => d.promise, "err");
    cache.replaceAll("activities", [log("server")]);
    expect(cache.all("activities").map((l) => l.id).sort()).toEqual(["local", "server"]);
  });
});

describe("tombstones", () => {
  it("replaceAll and upsertMany skip a tombstoned id, also for a while after the ack", async () => {
    cache.upsert("activities", log("a"));
    await optimisticDelete("activities", "a", ok, "err");
    cache.replaceAll("activities", [log("a"), log("b")]);
    expect(cache.all("activities").map((l) => l.id)).toEqual(["b"]);
    cache.upsertMany("activities", [log("a")]);
    expect(cache.get("activities", "a")).toBeUndefined();
  });

  it("expires ~10s after the ack", async () => {
    const now = jest.spyOn(Date, "now");
    now.mockReturnValue(1_000);
    cache.upsert("activities", log("a"));
    await optimisticDelete("activities", "a", ok, "err");
    now.mockReturnValue(1_000 + 9_000);
    expect(cache.isTombstoned("a")).toBe(true);
    now.mockReturnValue(1_000 + 11_000);
    cache.replaceAll("activities", [log("a")]);
    expect(cache.get("activities", "a")).toBeDefined();
  });

  it("a failed delete lifts the tombstone", async () => {
    cache.upsert("activities", log("a"));
    await optimisticDelete("activities", "a", fail, "err");
    expect(cache.isTombstoned("a")).toBe(false);
  });
});

describe("replaceAll with a scope", () => {
  it("keeps rows outside the reloaded window", () => {
    cache.upsert("activities", log("old", { ts: 1 }));
    cache.upsert("activities", log("gone", { ts: 100 }));
    cache.replaceAll("activities", [log("new", { ts: 200 })], (l) => l.ts >= 50);
    expect(cache.all("activities").map((l) => l.id).sort()).toEqual(["new", "old"]);
  });
});

describe("rollback only if unchanged", () => {
  it("does not clobber a field that was edited again after this patch", async () => {
    cache.upsert("activities", log("a", { note: "old" }));
    const update = optimisticUpdate("activities", "a", { note: "mine" }, fail, "err");
    cache.upsert("activities", { ...cache.get("activities", "a")!, note: "theirs" });
    await update;
    expect(cache.get("activities", "a")!.note).toBe("theirs");
  });
});
