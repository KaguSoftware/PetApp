import { act, fireEvent, screen } from "@testing-library/react-native";
import HistoryScreen from "@/app/(tabs)/history";
import { CAT, DOG, onlyPets } from "./_support/fakeData";
import { prepare, renderScreen } from "./_support/render";

// VirtualizedList batches render windows on a timer; let it fire inside act.
const settle = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 80));
  });

describe("History", () => {
  it("full household groups logs by day and shows rows", async () => {
    prepare("full");
    await renderScreen(<HistoryScreen />);
    expect(screen.getByText("Today")).toBeTruthy();
    expect(screen.getByText("Fed Rex")).toBeTruthy();
    expect(screen.getByText("Yesterday")).toBeTruthy();
  });

  it("rows name the pet only when the household has several", async () => {
    prepare("full");
    const many = await renderScreen(<HistoryScreen />);
    expect(screen.getAllByText("Mia").length).toBeGreaterThan(0);
    await settle();
    many.unmount();

    prepare("full");
    onlyPets(DOG);
    await renderScreen(<HistoryScreen />);
    await settle();
    expect(screen.queryByText("Mia")).toBeNull();
    expect(screen.getByText("Fed Rex")).toBeTruthy();
  });

  it("the pet filter narrows the list", async () => {
    prepare("full");
    await renderScreen(<HistoryScreen />);
    fireEvent.press(screen.getByLabelText(CAT.name));
    await settle();
    expect(screen.queryByText("Fed Rex")).toBeNull();
    expect(screen.getByText("Litter for Mia")).toBeTruthy();
  });

  it("opening a row shows the flat detail sheet with Edit and Delete", async () => {
    prepare("full");
    await renderScreen(<HistoryScreen />);
    fireEvent.press(screen.getByLabelText(/^Fed Rex,/));
    await settle();
    expect(screen.getByText("Delete")).toBeTruthy();
    expect(screen.getByText("Edit")).toBeTruthy();
  });

  it("no pets shows the empty state", async () => {
    prepare("noPets");
    await renderScreen(<HistoryScreen />);
    expect(screen.getByText("Nothing logged yet")).toBeTruthy();
  });

  it("signed-in without a household renders", async () => {
    prepare("noHousehold");
    await renderScreen(<HistoryScreen />);
    expect(screen.getByText("History")).toBeTruthy();
  });
});
