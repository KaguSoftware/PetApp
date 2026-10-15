import { screen } from "@testing-library/react-native";
import HistoryScreen from "@/app/(tabs)/history";
import { prepare, renderScreen } from "./_support/render";

describe("History", () => {
  it("full household groups logs by day and shows rows", async () => {
    prepare("full");
    await renderScreen(<HistoryScreen />);
    expect(screen.getByText("Today")).toBeTruthy();
    expect(screen.getByText("Fed Rex")).toBeTruthy();
    expect(screen.getByText("Yesterday")).toBeTruthy();
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
