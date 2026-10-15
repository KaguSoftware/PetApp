import { cache } from "../cache";
import { createHousehold, liveStreak, yesterdayIn } from "../household";
import { MutationError } from "../persist";
import { householdStore, INITIAL_HOUSEHOLD, sessionStore } from "../state";
import { clearToasts } from "../toasts";

let mockRpcCalls = 0;
let mockReleaseRpc!: (v: { data: string; error: null }) => void;

jest.mock("expo-crypto", () => ({ randomUUID: () => "uuid" }));
jest.mock("../client", () => ({
  supabase: {
    rpc: () => {
      mockRpcCalls++;
      return new Promise((r) => (mockReleaseRpc = r));
    },
    from: () => ({
      upsert: () => Promise.resolve({ error: null }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
    }),
    realtime: { setAuth: () => Promise.resolve(), isConnected: () => true },
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel: () => undefined,
  },
}));

beforeEach(() => {
  mockRpcCalls = 0;
  cache.reset();
  clearToasts();
  sessionStore.set({ ready: true, session: null, userId: "u1" });
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => {
  clearToasts();
  jest.restoreAllMocks();
});

describe("createHousehold", () => {
  it("refuses while the load failed or is unfinished, without calling the server", async () => {
    householdStore.set({ ...INITIAL_HOUSEHOLD, ready: true, loadError: "boom" });
    await expect(createHousehold()).rejects.toBeInstanceOf(MutationError);
    householdStore.set({ ...INITIAL_HOUSEHOLD, ready: false });
    await expect(createHousehold()).rejects.toBeInstanceOf(MutationError);
    expect(mockRpcCalls).toBe(0);
  });

  it("shares one RPC between concurrent calls", async () => {
    householdStore.set({ ...INITIAL_HOUSEHOLD, ready: true });
    const a = createHousehold("x");
    const b = createHousehold("x");
    expect(mockRpcCalls).toBe(1);
    // switchHousehold after the RPC finds no session rows and ends quietly.
    mockReleaseRpc({ data: "h1", error: null });
    await expect(Promise.all([a, b])).resolves.toEqual(["h1", "h1"]);
    expect(mockRpcCalls).toBe(1);
  });
});

describe("liveStreak", () => {
  // 2024-06-10 23:30 UTC is already 2024-06-11 in Auckland but still the 10th in Los Angeles.
  const now = Date.UTC(2024, 5, 10, 23, 30);
  it("computes yesterday in the household timezone", () => {
    expect(yesterdayIn("Pacific/Auckland", now)).toBe("2024-06-10");
    expect(yesterdayIn("America/Los_Angeles", now)).toBe("2024-06-09");
  });
  it("keeps a run whose last day is yesterday there, drops an older one", () => {
    expect(liveStreak(5, "2024-06-10", "Pacific/Auckland", now)).toBe(5);
    expect(liveStreak(5, "2024-06-09", "Pacific/Auckland", now)).toBe(0);
    expect(liveStreak(5, "2024-06-09", "America/Los_Angeles", now)).toBe(5);
  });
  it("survives an unknown zone and a missing streak_day", () => {
    expect(() => liveStreak(3, "2024-06-10", "Not/AZone", now)).not.toThrow();
    expect(liveStreak(3, null, "Pacific/Auckland", now)).toBe(3);
  });
});
