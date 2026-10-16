import { fireEvent, screen } from "@testing-library/react-native";
import SettingsScreen from "@/app/settings";
import { fns } from "./_support/fakeData";
import { prepare, renderScreen } from "./_support/render";

describe("Settings", () => {
  it("native Settings title; groups are cards with rows: pets, family, units, appearance, account", async () => {
    prepare("full");
    await renderScreen(<SettingsScreen />);
    expect(screen.getByRole("header", { name: "Settings" })).toBeTruthy();
    for (const t of ["Your pets", "Units", "Appearance", "Account", "Add a pet", "Delete account", "Terms of Service"]) {
      expect(screen.getByText(t)).toBeTruthy();
    }
    expect(screen.getByLabelText("Metric (kg)")).toBeTruthy();
    expect(screen.getByLabelText("Dark")).toBeTruthy();
  });

  it("units and theme are native menus, not segmented controls", async () => {
    prepare("full");
    await renderScreen(<SettingsScreen />);
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.getByLabelText("Weight units, Metric (kg)")).toBeTruthy();
    fireEvent.press(screen.getByRole("menuitem", { name: "Imperial (lb)" }));
    expect(fns.setUnits).toHaveBeenCalledWith("imperial");
    expect(screen.getByLabelText("Theme, Auto")).toBeTruthy();
    fireEvent.press(screen.getByRole("menuitem", { name: "Dark" }));
    expect(screen.getByLabelText("Theme, Dark")).toBeTruthy();
    fireEvent.press(screen.getByRole("menuitem", { name: "Auto" }));
  });

  it.each(["full", "noPets", "noHousehold"] as const)("renders (%s) with Sign out and Family", async (scenario) => {
    prepare(scenario);
    await renderScreen(<SettingsScreen />);
    expect(screen.getByText("Sign out")).toBeTruthy();
    expect(screen.getByText(/Family/)).toBeTruthy();
  });
});
