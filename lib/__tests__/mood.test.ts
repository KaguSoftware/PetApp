import type { CareLog, CareType } from "@/data";
import { computeMood } from "../mood";

const H = 3_600_000;
// 2024-06-12 15:00 local
const NOW = new Date(2024, 5, 12, 15, 0, 0).getTime();
const dog = { id: "d", species: "dog" as const };
const cat = { id: "c", species: "cat" as const };

let n = 0;
const log = (petId: string, type: CareType, hoursAgo: number, now = NOW): CareLog => ({
  id: `l${++n}`,
  petId,
  memberId: null,
  type,
  ts: now - hoursAgo * H,
  note: null,
  grams: null,
  medId: null,
  durationMinutes: null,
});

describe("computeMood", () => {
  it("is content with no logs", () => {
    expect(computeMood(dog, [], NOW).mood).toBe("content");
  });

  it("ignores other pets' logs", () => {
    expect(computeMood(dog, [log("other", "fed", 20)], NOW).mood).toBe("content");
  });

  it("is hungry when not fed in 10h+", () => {
    expect(computeMood(cat, [log("c", "fed", 11)], NOW).mood).toBe("hungry");
  });

  it("is thirsty only if water was ever logged", () => {
    const fed = log("c", "fed", 1);
    expect(computeMood(cat, [fed, log("c", "water", 13)], NOW).mood).toBe("thirsty");
    expect(computeMood(cat, [fed, log("c", "groomed", 30)], NOW).mood).not.toBe("thirsty");
  });

  it("makes a dog restless without a walk after noon", () => {
    const logs = [log("d", "fed", 3), log("d", "water", 3), log("d", "walk", 20)];
    expect(computeMood(dog, logs, NOW).mood).toBe("restless");
    expect(computeMood(dog, [...logs, log("d", "walk", 5)], NOW).mood).not.toBe("restless");
  });

  it("does not make a dog restless before noon", () => {
    const morning = new Date(2024, 5, 12, 9, 0, 0).getTime();
    const logs = [log("d", "fed", 2, morning)];
    expect(computeMood(dog, logs, morning).mood).not.toBe("restless");
  });

  it("makes a cat grumpy when litter is overdue", () => {
    const logs = [log("c", "fed", 3), log("c", "litter", 40)];
    expect(computeMood(cat, logs, NOW).mood).toBe("grumpy");
  });

  it("is happy right after a log", () => {
    expect(computeMood(cat, [log("c", "fed", 0.5)], NOW).mood).toBe("happy");
  });

  it("is sleepy at night when needs are met", () => {
    const night = new Date(2024, 5, 12, 23, 0, 0).getTime();
    expect(computeMood(cat, [log("c", "fed", 1, night)], night).mood).toBe("sleepy");
  });

  it("stays hungry at night if not fed", () => {
    const night = new Date(2024, 5, 12, 23, 0, 0).getTime();
    expect(computeMood(cat, [log("c", "fed", 12, night)], night).mood).toBe("hungry");
  });

  it("is content when cared for a few hours ago", () => {
    expect(computeMood(cat, [log("c", "fed", 5)], NOW).mood).toBe("content");
  });
});
