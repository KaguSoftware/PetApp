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

  it("shows a step indicator and no art", async () => {
    prepare("noHousehold");
    await renderScreen(<AdoptScreen />);
    expect(screen.getByLabelText("Step 1 of 3")).toBeTruthy();
  });

  it("name then reveal is plain text and ends with a confirm button", async () => {
    prepare("noHousehold");
    await renderScreen(<AdoptScreen />);
    fireEvent.press(screen.getByLabelText("Dog"));
    fireEvent.press(screen.getByText("Continue"));
    fireEvent.changeText(screen.getByLabelText("Pet name"), "Biscuit");
    fireEvent.press(screen.getByText("Meet them"));
    expect(screen.getByText("Biscuit is here")).toBeTruthy();
    expect(screen.getByText("Welcome home, Biscuit!")).toBeTruthy();
    expect(screen.getByLabelText("Step 3 of 3")).toBeTruthy();
  });

  it("optional details use a native date picker and a native gender menu", async () => {
    prepare("noHousehold");
    await renderScreen(<AdoptScreen />);
    fireEvent.press(screen.getByLabelText("Cat"));
    fireEvent.press(screen.getByText("Continue"));
    fireEvent.changeText(screen.getByLabelText("Pet name"), "Miso");
    fireEvent.press(screen.getByText("Meet them"));
    fireEvent.press(screen.getByText("Add more about Miso (optional)"));
    expect(screen.getByLabelText("Set Birthday")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Set Birthday"));
    expect(screen.getByTestId("datetime-date")).toBeTruthy();
    fireEvent.press(screen.getByRole("menuitem", { name: "Girl" }));
    expect(screen.getByLabelText("Gender, Girl")).toBeTruthy();
  });

  it("choosing Other reveals the extra species", async () => {
    prepare("noHousehold");
    await renderScreen(<AdoptScreen />);
    fireEvent.press(screen.getByLabelText("Other"));
    // A native menu (not chips): one row, with every kind as a menu item.
    expect(screen.getByLabelText("Kind of pet, Something else")).toBeTruthy();
    fireEvent.press(screen.getByRole("menuitem", { name: "Rabbit" }));
    expect(screen.getByLabelText("Kind of pet, Rabbit")).toBeTruthy();
  });
});

describe("Join", () => {
  it("renders the invite code entry", async () => {
    prepare("noHousehold");
    await renderScreen(<JoinScreen />);
    expect(screen.getByRole("header", { name: "Join a family" })).toBeTruthy();
    expect(screen.getByText(/invite code/)).toBeTruthy();
  });

  it("renders with a code in the route params", async () => {
    prepare("noHousehold", { code: "ABCD-2345" });
    await renderScreen(<JoinScreen />);
    expect(screen.getByText("Join a family")).toBeTruthy();
  });
});
