import { fireEvent, screen } from "@testing-library/react-native";
import HomeScreen from "@/app/(tabs)/home";
import { fns, setScenario } from "./_support/fakeData";
import { prepare, renderScreen } from "./_support/render";
import { router } from "./_support/routerMock";

// Noon today, so the "1h ago" / "2h ago" fixtures never cross midnight.
const NOON = new Date().setHours(12, 0, 0, 0);

describe("Home", () => {
  let nowSpy: jest.SpyInstance;
  beforeEach(() => {
    nowSpy = jest.spyOn(Date, "now").mockReturnValue(NOON);
  });
  afterEach(() => nowSpy.mockRestore());

  it("(b) signed in with no household redirects to adoption and shows the empty state", async () => {
    prepare("noHousehold");
    await renderScreen(<HomeScreen />);
    expect(router.replace).toHaveBeenCalledWith("/(onboarding)/adopt");
    expect(screen.getByText("Let's find your first pet")).toBeTruthy();
  });

  it("(c) load error shows the retry state, not onboarding", async () => {
    prepare("loadError");
    await renderScreen(<HomeScreen />);
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByText(/retry|try again/i)).toBeTruthy();
  });

  it("(d) shows the pet name, the streak and today's rows", async () => {
    prepare("full");
    await renderScreen(<HomeScreen />);
    expect(screen.getByText("Rex")).toBeTruthy();
    expect(screen.getByText("3 days")).toBeTruthy();
    expect(screen.getByText("Today")).toBeTruthy();
    expect(screen.getByText("Fed")).toBeTruthy();
    expect(screen.getByText("Walk · 30 min")).toBeTruthy();
    expect(screen.getByText("Note")).toBeTruthy();
    // Yesterday's water and the other pet's litter stay out.
    expect(screen.queryByText("Water")).toBeNull();
    expect(screen.queryByText("Litter")).toBeNull();
    // More than one member: who logged it.
    expect(screen.getAllByText("Parsa").length).toBeGreaterThan(0);
    expect(fns.logCare).not.toHaveBeenCalled();
  });

  it("shows the empty state when nothing was logged today", async () => {
    prepare("full");
    setScenario((s) => ({ ...s, logs: [], notes: [], weights: [] }));
    await renderScreen(<HomeScreen />);
    expect(screen.getByText("Nothing logged yet today.")).toBeTruthy();
  });

  it("hides the streak at zero", async () => {
    prepare("full");
    setScenario((s) => ({ ...s, household: { ...s.household, streak: 0 } }));
    await renderScreen(<HomeScreen />);
    expect(screen.queryByText(/^\d+ days?$/)).toBeNull();
  });

  it("the name opens a pet menu: switch pet or add one", async () => {
    prepare("full");
    await renderScreen(<HomeScreen />);
    fireEvent.press(screen.getByLabelText("Rex, switch pet"));
    expect(screen.getByLabelText("Mia")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Add pet"));
    expect(router.push).toHaveBeenCalledWith("/pet/new");
  });

  it("the settings button opens settings", async () => {
    prepare("full");
    await renderScreen(<HomeScreen />);
    fireEvent.press(screen.getByLabelText("Settings"));
    expect(router.push).toHaveBeenCalledWith("/settings");
  });

  it("(e) household with no pets shows the adopt empty state", async () => {
    prepare("noPets");
    await renderScreen(<HomeScreen />);
    expect(screen.getByText("Adopt your first pet")).toBeTruthy();
  });
});
