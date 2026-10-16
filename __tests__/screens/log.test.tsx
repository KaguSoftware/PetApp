import { fireEvent, screen } from "@testing-library/react-native";
import LogScreen from "@/app/log";
import { CAT, DOG, fns, onlyPets } from "./_support/fakeData";
import { prepare, renderScreen } from "./_support/render";
import { router } from "./_support/routerMock";

// The native picker (SwiftUI / Compose) has no JS to render: stand in a button that picks 15 minutes ago.
jest.mock("@expo/ui/community/datetime-picker", () => {
  const { Pressable } = require("react-native");
  const Picker = (p: { mode?: string; value: Date; onValueChange?: (e: unknown, d: Date) => void }) => (
    <Pressable
      accessibilityLabel={`${p.mode} picker`}
      onPress={() => p.onValueChange?.({ nativeEvent: {} }, new Date(Date.now() - 15 * 60_000))}
    />
  );
  return { __esModule: true, default: Picker, DateTimePicker: Picker };
});

// Noon today, so the "1h ago" fixtures never cross midnight.
const NOON = new Date().setHours(12, 0, 0, 0);

describe("+ panel", () => {
  let nowSpy: jest.SpyInstance;
  beforeEach(() => {
    nowSpy = jest.spyOn(Date, "now").mockReturnValue(NOON);
  });
  afterEach(() => nowSpy.mockRestore());

  it("a dog gets Food, Water, Walk, Weight, Meds, Note and More, with last-time lines", async () => {
    prepare("full", { petId: DOG.id });
    await renderScreen(<LogScreen />);
    for (const t of ["Food", "Water", "Walk", "Weight", "Meds", "Note", "More"]) expect(screen.getByText(t)).toBeTruthy();
    expect(screen.queryByText("Litter")).toBeNull();
    expect(screen.getByText("1h ago")).toBeTruthy(); // food
    expect(screen.getByText("12 kg")).toBeTruthy();
    expect(screen.getByText("Not yet")).toBeTruthy(); // meds: Apoquel is defined but never given
  });

  it("a cat gets Litter instead of Walk", async () => {
    prepare("full", { petId: CAT.id });
    onlyPets(CAT);
    await renderScreen(<LogScreen />);
    expect(screen.getByText("Litter")).toBeTruthy();
    expect(screen.getByText("Food")).toBeTruthy();
    expect(screen.queryByText("Walk")).toBeNull();
  });

  it("without a petId param it logs for the pet selected on Home", async () => {
    prepare("full");
    await renderScreen(<LogScreen />);
    fireEvent.press(screen.getByText("Food"));
    fireEvent.press(screen.getByText("Save"));
    expect(fns.logCare.mock.calls[0][0]).toBe(DOG.id);
  });

  it("Food then Save logs with a client id, toasts an Undo and closes", async () => {
    prepare("full", { petId: DOG.id });
    await renderScreen(<LogScreen />);
    fireEvent.press(screen.getByText("Food"));
    fireEvent.press(screen.getByText("Save"));
    expect(fns.logCare).toHaveBeenCalledWith(DOG.id, "fed", expect.objectContaining({ id: expect.any(String) }));
    expect(fns.showToast).toHaveBeenCalledWith(expect.objectContaining({ kind: "undo", actionLabel: "Undo", text: "Fed · Rex" }));
    expect(router.back).toHaveBeenCalled();
  });

  it("Undo deletes the log that was just created", async () => {
    prepare("full", { petId: DOG.id });
    await renderScreen(<LogScreen />);
    fireEvent.press(screen.getByText("Food"));
    fireEvent.press(screen.getByText("Save"));
    const id = (fns.logCare.mock.calls[0][2] as { id: string }).id;
    (fns.showToast.mock.calls[0][0] as { onAction: () => void }).onAction();
    expect(fns.deleteLog).toHaveBeenCalledWith(id);
  });

  it("the native time picker back-dates the log and grams are optional", async () => {
    prepare("full", { petId: DOG.id });
    await renderScreen(<LogScreen />);
    fireEvent.press(screen.getByText("Food"));
    fireEvent.press(screen.getByLabelText("time picker"));
    fireEvent.changeText(screen.getByLabelText("Grams"), "60");
    fireEvent.press(screen.getByText("Save"));
    expect(fns.logCare).toHaveBeenCalledWith(DOG.id, "fed", expect.objectContaining({ grams: 60, ts: NOON - 15 * 60_000 }));
  });

  it("an untouched time logs as now (no ts), so the data layer stamps it", async () => {
    prepare("full", { petId: DOG.id });
    await renderScreen(<LogScreen />);
    fireEvent.press(screen.getByText("Food"));
    fireEvent.press(screen.getByText("Save"));
    expect((fns.logCare.mock.calls[0][2] as { ts?: number }).ts).toBeUndefined();
  });

  it("a vet visit takes its date from the native date picker", async () => {
    prepare("full", { petId: DOG.id, step: "vet" });
    await renderScreen(<LogScreen />);
    fireEvent.press(screen.getByLabelText("date picker"));
    fireEvent.changeText(screen.getByLabelText("REASON"), "Check-up");
    fireEvent.press(screen.getByText("Save"));
    expect(fns.addVetVisit).toHaveBeenCalledWith(
      expect.objectContaining({ petId: DOG.id, reason: "Check-up", date: expect.stringMatching(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/) }),
    );
  });

  it("More opens vet visit, vaccination and grooming; Back returns to the first level", async () => {
    prepare("full", { petId: DOG.id });
    await renderScreen(<LogScreen />);
    fireEvent.press(screen.getByText("More"));
    for (const t of ["Vet visit", "Vaccination", "Grooming"]) expect(screen.getByText(t)).toBeTruthy();
    fireEvent.press(screen.getByText("Grooming"));
    fireEvent.press(screen.getByLabelText("Back"));
    expect(screen.getByText("Grooming")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Back"));
    expect(screen.getByText("Food")).toBeTruthy();
  });

  it("step=weight opens the weight form; typing 12.5 and saving calls addWeight", async () => {
    prepare("full", { petId: DOG.id, step: "weight" });
    await renderScreen(<LogScreen />);
    expect(screen.queryByText("Food")).toBeNull();
    fireEvent.press(screen.getByLabelText("12.0 kg"));
    fireEvent.changeText(screen.getByLabelText("Weight in kg"), "12.5");
    fireEvent.press(screen.getByText("Save"));
    expect(fns.addWeight).toHaveBeenCalledWith(DOG.id, 12.5);
    expect(fns.showToast).toHaveBeenCalledWith(expect.objectContaining({ kind: "undo", text: "Weight 12.5 kg · Rex" }));
  });

  it("step=note saves a note", async () => {
    prepare("full", { petId: DOG.id, step: "note" });
    await renderScreen(<LogScreen />);
    fireEvent.changeText(screen.getByLabelText("Note text"), "  limping a little ");
    fireEvent.press(screen.getByText("Save"));
    expect(fns.addNote).toHaveBeenCalledWith(DOG.id, "note", "limping a little");
  });

  it("step=meds logs the picked medication", async () => {
    prepare("full", { petId: DOG.id, step: "meds" });
    await renderScreen(<LogScreen />);
    fireEvent.press(screen.getByText("Save"));
    expect(fns.logCare).toHaveBeenCalledWith(DOG.id, "meds", expect.objectContaining({ medId: "med1", id: expect.any(String) }));
  });

  it("a step the species does not have falls back to the first level", async () => {
    prepare("full", { petId: CAT.id, step: "walk" });
    onlyPets(CAT);
    await renderScreen(<LogScreen />);
    expect(screen.getByText("Litter")).toBeTruthy();
  });

  it("with no pets shows the add-a-pet hint", async () => {
    prepare("noPets");
    await renderScreen(<LogScreen />);
    expect(screen.getByText(/Add a pet first/)).toBeTruthy();
  });
});
