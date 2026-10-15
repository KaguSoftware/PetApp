import { fireEvent, screen } from "@testing-library/react-native";
import AdoptScreen from "@/app/(onboarding)/adopt";
import JoinScreen from "@/app/join";
import { prepare, renderScreen } from "./_support/render";

describe("Adopt", () => {
  it("first step offers the species choices", async () => {
    prepare("noHousehold");
    await renderScreen(<AdoptScreen />);
    for (const s of ["Dog", "Cat", "Other"]) expect(screen.getByLabelText(s)).toBeTruthy();
    expect(screen.getByText("Continue")).toBeTruthy();
  });

  it("choosing Other reveals the extra species", async () => {
    prepare("noHousehold");
    await renderScreen(<AdoptScreen />);
    fireEvent.press(screen.getByLabelText("Other"));
    expect(screen.getByText("Rabbit")).toBeTruthy();
    expect(screen.getByText("Something else")).toBeTruthy();
  });
});

describe("Join", () => {
  it("renders the invite code entry", async () => {
    prepare("noHousehold");
    await renderScreen(<JoinScreen />);
    expect(screen.getByText("Join a family")).toBeTruthy();
    expect(screen.getByText(/invite code/)).toBeTruthy();
  });

  it("renders with a code in the route params", async () => {
    prepare("noHousehold", { code: "ABCD-2345" });
    await renderScreen(<JoinScreen />);
    expect(screen.getByText("Join a family")).toBeTruthy();
  });
});
