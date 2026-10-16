import { screen } from "@testing-library/react-native";
import SettingsScreen from "@/app/settings";
import { prepare, renderScreen } from "./_support/render";

describe("Settings", () => {
  it("groups are cards with rows: pets, family, units, appearance, account", async () => {
    prepare("full");
    await renderScreen(<SettingsScreen />);
    for (const t of ["Your pets", "Units", "Appearance", "Account", "Add a pet", "Delete account", "Terms of Service"]) {
      expect(screen.getByText(t)).toBeTruthy();
    }
    expect(screen.getByLabelText("Metric (kg)")).toBeTruthy();
    expect(screen.getByLabelText("Dark")).toBeTruthy();
  });

  it.each(["full", "noPets", "noHousehold"] as const)("renders (%s) with Sign out and Family", async (scenario) => {
    prepare(scenario);
    await renderScreen(<SettingsScreen />);
    expect(screen.getByText("Sign out")).toBeTruthy();
    expect(screen.getByText(/Family/)).toBeTruthy();
  });
});
