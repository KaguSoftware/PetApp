import { cache } from "../cache";
import { deleteLog, logCare } from "../logs";
import { clearToasts } from "../toasts";
import { householdStore, sessionStore } from "../state";

type Call = { op: string; table: string; payload?: unknown };
const mockCalls: Call[] = [];
let mockInsertResults: Promise<{ error: unknown }>[] = [];

jest.mock("expo-crypto", () => {
  let n = 0;
  return { randomUUID: () => `uuid-${++n}` };
});
jest.mock("../client", () => ({
  supabase: {
    from: (table: string) => ({
      insert: (payload: unknown) => {
        mockCalls.push({ op: "insert", table, payload });
        return mockInsertResults.shift() ?? Promise.resolve({ error: null });
      },
      delete: () => ({
        eq: (_col: string, id: string) => {
          mockCalls.push({ op: "delete", table, payload: id });
          return Promise.resolve({ error: null });
        },
      }),
    }),
  },
}));

beforeEach(() => {
  mockCalls.length = 0;
  mockInsertResults = [];
  cache.reset();
  householdStore.set({ ready: true, householdId: "h1", streak: 0, units: "metric", loadError: null });
  sessionStore.set({ ready: true, session: null, userId: "u1" });
  cache.upsert("links", { id: "u1", userId: "u1", role: "owner", memberId: "m1" });
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(clearToasts);

describe("logCare / deleteLog", () => {
  it("inserts with a client id, attribution and household", async () => {
    const log = await logCare("p1", "walk", { durationMinutes: 20 });
    expect(log.id).toMatch(/^uuid-/);
    expect(mockCalls[0]).toMatchObject({
      op: "insert",
      table: "activities",
      payload: { id: log.id, household_id: "h1", pet_id: "p1", member_id: "m1", user_id: "u1", type: "walk", duration_minutes: 20 },
    });
  });

  it("undo straight after logging leaves nothing behind", async () => {
    let release!: (v: { error: null }) => void;
    mockInsertResults.push(new Promise((r) => (release = r)));
    const pending = logCare("p1", "fed");
    const id = cache.all("activities")[0].id;
    const del = deleteLog(id);
    await new Promise((r) => setTimeout(r, 0));
    expect(mockCalls.map((c) => c.op)).toEqual(["insert"]);
    release({ error: null });
    await pending;
    await del;
    expect(mockCalls.map((c) => c.op)).toEqual(["insert", "delete"]);
    expect(mockCalls[1].payload).toBe(id);
    expect(cache.all("activities")).toEqual([]);
  });

  it("when the first of two quick logs fails, the second survives", async () => {
    mockInsertResults.push(Promise.resolve({ error: { message: "nope" } }));
    const first = logCare("p1", "fed");
    const second = logCare("p1", "water");
    await expect(first).rejects.toBeDefined();
    await second;
    expect(cache.all("activities").map((l) => l.type)).toEqual(["water"]);
  });
});
