import { act, fireEvent, screen } from "@testing-library/react-native";
import { Alert } from "react-native";
import HistoryScreen from "@/app/(tabs)/history/index";
import HistoryDetailSheet from "@/app/history/[kind]/[id]";
import { CAT, DOG, fns, onlyPets } from "./_support/fakeData";
import { prepare, renderScreen } from "./_support/render";
import { router } from "./_support/routerMock";

// VirtualizedList batches render windows on a timer; let it fire inside act.
const settle = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 80));
  });

const item = (name: string) => screen.getByRole("menuitem", { name });

describe("History", () => {
  it("full household groups logs by day and shows rows under a native History title", async () => {
    prepare("full");
    await renderScreen(<HistoryScreen />);
    expect(screen.getByRole("header", { name: "History" })).toBeTruthy();
    expect(screen.getByText("Today")).toBeTruthy();
    expect(screen.getByText("Fed Rex")).toBeTruthy();
    expect(screen.getByText("Yesterday")).toBeTruthy();
  });

  it("has no row of filter pills: one header filter menu with Pet and Type sections", async () => {
    prepare("full");
    await renderScreen(<HistoryScreen />);
    await settle();
    expect(screen.getAllByTestId("toolbar-menu")).toHaveLength(1);
    expect(screen.getByLabelText("Filter history")).toBeTruthy();
    // Sections of the menu...
    expect(screen.getByText("Pet")).toBeTruthy();
    expect(screen.getByText("Type")).toBeTruthy();
    // ...and nothing filter-shaped in the page body (menu items are the only "Care" / "Weight" controls).
    expect(screen.queryByRole("button", { name: "Care" })).toBeNull();
    expect(screen.queryByRole("button", { name: "All pets" })).toBeNull();
    expect(screen.queryByLabelText("Filter by pet")).toBeNull();
    expect(screen.queryByLabelText("Filter by type")).toBeNull();
    // Nothing is filtered, so there is no grey "active filter" line.
    expect(screen.queryByLabelText(/^Showing /)).toBeNull();
    expect(item("All pets").props.accessibilityState.checked).toBe(true);
    expect(item("All types").props.accessibilityState.checked).toBe(true);
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
    // One pet: the Pet section of the menu is not offered.
    expect(screen.queryByRole("menuitem", { name: "All pets" })).toBeNull();
  });

  it("the Pet menu section narrows the list and shows the active filter line", async () => {
    prepare("full");
    await renderScreen(<HistoryScreen />);
    fireEvent.press(item(CAT.name));
    await settle();
    expect(screen.queryByText("Fed Rex")).toBeNull();
    expect(screen.getByText("Litter for Mia")).toBeTruthy();
    expect(item(CAT.name).props.accessibilityState.checked).toBe(true);
    expect(screen.getByLabelText("Showing Mia")).toBeTruthy();
    fireEvent.press(item("All pets"));
    await settle();
    expect(screen.getByText("Fed Rex")).toBeTruthy();
    expect(screen.queryByLabelText(/^Showing /)).toBeNull();
  });

  it("the Type menu section filters by category", async () => {
    prepare("full");
    await renderScreen(<HistoryScreen />);
    fireEvent.press(item("Weight"));
    await settle();
    expect(screen.queryByText("Fed Rex")).toBeNull();
    expect(screen.getAllByText(/^Weight ·/).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Showing Weight")).toBeTruthy();
    fireEvent.press(item(CAT.name));
    await settle();
    expect(screen.getByLabelText("Showing Mia · Weight")).toBeTruthy();
  });

  it("opening a row routes to the native detail sheet", async () => {
    prepare("full");
    await renderScreen(<HistoryScreen />);
    fireEvent.press(screen.getByLabelText(/^Fed Rex,/));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/history/[kind]/[id]",
      params: { kind: "care", id: "l1", petId: DOG.id },
    });
  });

  it("no pets shows the empty state", async () => {
    prepare("noPets");
    await renderScreen(<HistoryScreen />);
    expect(screen.getByText("Nothing logged yet")).toBeTruthy();
  });

  it("signed-in without a household renders", async () => {
    prepare("noHousehold");
    await renderScreen(<HistoryScreen />);
    expect(screen.getByRole("header", { name: "History" })).toBeTruthy();
  });
});

describe("History detail sheet", () => {
  it("shows the entry with Edit and Delete; Delete asks via a native Alert", async () => {
    prepare("full", { kind: "care", id: "l1", petId: DOG.id });
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    await renderScreen(<HistoryDetailSheet />);
    expect(screen.getByText("Fed Rex")).toBeTruthy();
    expect(screen.getByText("Edit")).toBeTruthy();
    fireEvent.press(screen.getByText("Delete"));
    expect(alert).toHaveBeenCalled();
    const buttons = alert.mock.calls[0][2]!;
    await act(async () => {
      buttons.find((b) => b.style === "destructive")!.onPress!();
    });
    expect(router.back).toHaveBeenCalled();
    expect(fns.deleteLog).toHaveBeenCalledWith("l1");
    alert.mockRestore();
  });

  it("editing a care log uses native date and time pickers", async () => {
    prepare("full", { kind: "care", id: "l1", petId: DOG.id });
    await renderScreen(<HistoryDetailSheet />);
    fireEvent.press(screen.getByText("Edit"));
    expect(screen.getByTestId("datetime-date")).toBeTruthy();
    expect(screen.getByTestId("datetime-time")).toBeTruthy();
    fireEvent.press(screen.getByText("Save changes"));
    expect(fns.editLog).toHaveBeenCalled();
  });

  it("a weight entry has no Edit", async () => {
    prepare("full", { kind: "weight", id: "w3", petId: DOG.id });
    await renderScreen(<HistoryDetailSheet />);
    expect(screen.queryByText("Edit")).toBeNull();
    expect(screen.getByText("Delete")).toBeTruthy();
  });
});
