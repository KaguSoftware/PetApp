import { screen } from "@testing-library/react-native";
import SettingsScreen from "@/app/settings";
import { prepare, renderScreen } from "./_support/render";

describe("Settings", () => {
  it.each(["full", "noPets", "noHousehold"] as const)("renders (%s) with Sign out and Family", async (scenario) => {
    prepare(scenario);
    await renderScreen(<SettingsScreen />);
    expect(screen.getByText("Sign out")).toBeTruthy();
    expect(screen.getByText(/Family/)).toBeTruthy();
  });
});
