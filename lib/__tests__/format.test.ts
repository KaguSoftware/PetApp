import {
  ageLabel,
  dayLabel,
  daysUntil,
  formatDate,
  isValidDateString,
  kgDeltaDisplay,
  kgToDisplay,
  parseWeightInput,
  relativeTime,
} from "../format";

const now = new Date(2026, 9, 15, 14, 0).getTime(); // Thu 15 Oct 2026, 14:00 local
const at = (d: number, h = 12, min = 0) => new Date(2026, 9, d, h, min).getTime();

describe("relativeTime", () => {
  it("handles minutes, hours and days", () => {
    expect(relativeTime(now - 10_000, now)).toBe("just now");
    expect(relativeTime(now - 5 * 60_000, now)).toBe("5 min ago");
    expect(relativeTime(at(15, 9), now)).toBe("5 h ago");
    expect(relativeTime(at(14, 20), now)).toBe("Yesterday");
    expect(relativeTime(at(12), now)).toBe("3 days ago");
    expect(relativeTime(at(1), now)).toBe("1 Oct");
  });
});

describe("dayLabel", () => {
  it("labels today, yesterday and older days", () => {
    expect(dayLabel(at(15, 1), now)).toBe("Today");
    expect(dayLabel(at(14, 23), now)).toBe("Yesterday");
    expect(dayLabel(at(12), now)).toBe("Mon 12 Oct");
    expect(dayLabel(new Date(2025, 9, 12).getTime(), now)).toBe("Sun 12 Oct 2025");
  });
});

describe("weights", () => {
  it("formats metric and imperial", () => {
    expect(kgToDisplay(4.2, "metric")).toBe("4.2 kg");
    expect(kgToDisplay(4.2, "imperial")).toBe("9.3 lb");
    expect(kgDeltaDisplay(0.2, "metric")).toBe("+0.2 kg");
    expect(kgDeltaDisplay(-0.1, "metric")).toBe("-0.1 kg");
    expect(kgDeltaDisplay(0, "metric")).toBe("0 kg");
  });
  it("parses input in display units", () => {
    expect(parseWeightInput("4,2", "metric")).toBeCloseTo(4.2);
    expect(parseWeightInput("10", "imperial")).toBeCloseTo(4.536, 2);
    expect(parseWeightInput("abc", "metric")).toBeNull();
    expect(parseWeightInput("0", "metric")).toBeNull();
  });
});

describe("dates", () => {
  it("formats yyyy-mm-dd", () => {
    expect(formatDate("2025-10-12")).toBe("12 Oct 2025");
    expect(formatDate("nope")).toBe("nope");
  });
  it("validates date strings", () => {
    expect(isValidDateString("2026-02-28")).toBe(true);
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(isValidDateString("12/10/2026")).toBe(false);
  });
  it("counts days until", () => {
    expect(daysUntil("2026-10-20", now)).toBe(5);
    expect(daysUntil("2026-10-10", now)).toBe(-5);
  });
  it("labels age", () => {
    expect(ageLabel("2023-03-01", now)).toBe("3 y");
    expect(ageLabel("2026-05-01", now)).toBe("5 mo");
    expect(ageLabel(null, now)).toBeNull();
  });
});
