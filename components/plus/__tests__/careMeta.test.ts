import { formFromStep, moreRows, rootRows } from "../careMeta";

describe("rows by species", () => {
  it("dogs walk, cats get litter, birds get neither", () => {
    expect(rootRows("dog")).toEqual(["fed", "water", "walk", "weight", "meds", "note"]);
    expect(rootRows("cat")).toEqual(["fed", "water", "litter", "weight", "meds", "note"]);
    expect(rootRows("bird")).toEqual(["fed", "water", "weight", "meds", "note"]);
    expect(moreRows("dog")).toEqual(["vet", "vaccination", "groomed"]);
  });
  it("maps /log step params", () => {
    expect(formFromStep("food")).toBe("fed");
    expect(formFromStep("groom")).toBe("groomed");
    expect(formFromStep("weight")).toBe("weight");
    expect(formFromStep("nope")).toBeNull();
    expect(formFromStep(undefined)).toBeNull();
  });
});
