import { fireEvent, screen } from "@testing-library/react-native";
import LogScreen from "@/app/log";
import { CAT, DOG, fns, onlyPets } from "./_support/fakeData";
import { prepare, renderScreen } from "./_support/render";

describe("Log sheet", () => {
  it("dog selection offers Fed, Water and Walk", async () => {
    prepare("full", { petId: DOG.id });
    await renderScreen(<LogScreen />);
    expect(screen.getByText("What did Rex do?")).toBeTruthy();
    for (const t of ["Fed", "Water", "Walk", "Weight"]) expect(screen.getByText(t)).toBeTruthy();
  });

  it("cat-only selection has Litter and no Walk", async () => {
    prepare("full", { petId: CAT.id });
    onlyPets(CAT);
    await renderScreen(<LogScreen />);
    expect(screen.getByText("Litter")).toBeTruthy();
    expect(screen.getByText("Fed")).toBeTruthy();
    expect(screen.getByText("Water")).toBeTruthy();
    expect(screen.queryByText("Walk")).toBeNull();
  });

  it("pressing Fed logs the selected pet and shows an undo toast", async () => {
    prepare("full", { petId: DOG.id });
    await renderScreen(<LogScreen />);
    fireEvent.press(screen.getByText("Fed"));
    expect(fns.logCare).toHaveBeenCalledTimes(1);
    expect(fns.logCare.mock.calls[0][0]).toBe(DOG.id);
    expect(fns.logCare.mock.calls[0][1]).toBe("fed");
    expect(fns.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "undo", actionLabel: "Undo", text: expect.stringContaining("Rex") }),
    );
  });

  it("with All pets on, Walk logs only the dog", async () => {
    prepare("full", { petId: DOG.id });
    await renderScreen(<LogScreen />);
    fireEvent.press(screen.getByText("All pets"));
    expect(screen.getByText("What did everyone do?")).toBeTruthy();
    fireEvent.press(screen.getByText("Walk"));
    expect(fns.logCare).toHaveBeenCalledTimes(1);
    expect(fns.logCare.mock.calls[0][0]).toBe(DOG.id);
    expect(fns.logCare.mock.calls[0][1]).toBe("walk");
  });

  it("with All pets on, Fed logs both pets", async () => {
    prepare("full", { petId: DOG.id });
    await renderScreen(<LogScreen />);
    fireEvent.press(screen.getByText("All pets"));
    fireEvent.press(screen.getByText("Fed"));
    expect(fns.logCare.mock.calls.map((c) => c[0]).sort()).toEqual([CAT.id, DOG.id].sort());
  });

  it("weight step: typing 12.5 and saving calls addWeight(petId, 12.5)", async () => {
    prepare("full", { petId: DOG.id });
    await renderScreen(<LogScreen />);
    fireEvent.press(screen.getByText("Weight"));
    expect(screen.getByText("Rex's weight")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("12.0 kg"));
    fireEvent.changeText(screen.getByLabelText("Weight in kg"), "12.5");
    fireEvent.press(screen.getByText("Save weight"));
    expect(fns.addWeight).toHaveBeenCalledWith(DOG.id, 12.5);
  });

  it("with no pets shows the add-a-pet hint", async () => {
    prepare("noPets");
    await renderScreen(<LogScreen />);
    expect(screen.getByText(/Add a pet first/)).toBeTruthy();
  });
});
