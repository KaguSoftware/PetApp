import { screen } from "@testing-library/react-native";
import HomeScreen from "@/app/(tabs)/home";
import { fns } from "./_support/fakeData";
import { prepare, renderScreen } from "./_support/render";
import { router } from "./_support/routerMock";

describe("Home", () => {
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

  it("(d) full household shows the pet", async () => {
    prepare("full");
    await renderScreen(<HomeScreen />);
    expect(screen.getAllByText(/Rex/).length).toBeGreaterThan(0);
    expect(fns.logCare).not.toHaveBeenCalled();
  });

  it("(e) household with no pets shows the adopt empty state", async () => {
    prepare("noPets");
    await renderScreen(<HomeScreen />);
    expect(screen.getByText("Adopt your first pet")).toBeTruthy();
  });
});
