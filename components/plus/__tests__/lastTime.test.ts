import type { CareLog, Med, PetNote, WeightEntry } from "@/data";
import { agoLabel, careStatus, dateStatus, medsStatus, noteStatus, weightStatus, weightText } from "../lastTime";

const H = 3_600_000;
const D = 24 * H;
// Local noon, so "N hours ago" stays on the same calendar day for small N.
const NOW = new Date(2026, 9, 16, 12, 0, 0).getTime();

const log = (type: CareLog["type"], ts: number, extra: Partial<CareLog> = {}): CareLog => ({
  id: `${type}-${ts}`, petId: "p", memberId: null, type, ts, note: null, grams: null, medId: null, durationMinutes: null, ...extra,
});

describe("agoLabel", () => {
  it("covers minutes, hours, yesterday, days and old dates", () => {
    expect(agoLabel(NOW - 20_000, NOW)).toBe("Just now");
    expect(agoLabel(NOW - 12 * 60_000, NOW)).toBe("12 min ago");
    expect(agoLabel(NOW - 2 * H, NOW)).toBe("2h ago");
    expect(agoLabel(NOW - 1 * D, NOW)).toBe("Yesterday");
    expect(agoLabel(NOW - 3 * D, NOW)).toBe("3 days ago");
    expect(agoLabel(NOW - 20 * D, NOW)).toBe("26 Sep");
  });
});

describe("careStatus", () => {
  it("uses the newest log of that type and falls back to Not yet", () => {
    const logs = [log("fed", NOW - 5 * H), log("fed", NOW - 2 * H), log("water", NOW - 1 * H)];
    expect(careStatus(logs, "fed", NOW)).toBe("2h ago");
    expect(careStatus(logs, "walk", NOW)).toBe("Not yet");
  });
});

describe("weightStatus", () => {
  const w = (kg: number, ts: number): WeightEntry => ({ id: String(ts), petId: "p", kg, ts });
  it("shows the latest weight in the household units", () => {
    const ws = [w(4.0, NOW - 9 * D), w(4.2, NOW - 2 * D)];
    expect(weightStatus(ws, "metric")).toBe("4.2 kg");
    expect(weightStatus(ws, "imperial")).toBe("9.3 lb");
    expect(weightStatus([], "metric")).toBe("Not yet");
  });
  it("keeps hundredths for tiny pets", () => {
    expect(weightText(0.04, "metric")).toBe("0.04 kg");
  });
});

describe("medsStatus", () => {
  const med: Med = { id: "m1", petId: "p", name: "Apoquel", dose: null, schedule: null, active: true };
  it("handles no meds, no log, today and older logs", () => {
    expect(medsStatus([], [], NOW)).toBe("No meds yet");
    expect(medsStatus([med], [], NOW)).toBe("Not yet");
    const today = new Date(2026, 9, 16, 8, 0, 0).getTime();
    expect(medsStatus([med], [log("meds", today, { medId: "m1" })], NOW)).toBe("Apoquel · 08:00");
    expect(medsStatus([med], [log("meds", NOW - 1 * D, { medId: "m1" })], NOW)).toBe("Apoquel · Yesterday");
  });
});

describe("noteStatus / dateStatus", () => {
  it("formats the newest note and the latest date", () => {
    const n: PetNote = { id: "n", petId: "p", memberId: null, kind: "note", body: "x", ts: NOW - 3 * D };
    expect(noteStatus([n], NOW)).toBe("3 days ago");
    expect(noteStatus([], NOW)).toBe("Not yet");
    expect(dateStatus(["2025-03-01", "2025-10-12"])).toBe("12 Oct 2025");
    expect(dateStatus([])).toBe("Not yet");
  });
});
