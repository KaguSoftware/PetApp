import { fireEvent, screen } from "@testing-library/react-native";
import PetProfileScreen from "@/app/pet/[id]";
import { CAT, DOG } from "./_support/fakeData";
import { prepare, renderScreen } from "./_support/render";
import { router } from "./_support/routerMock";

describe("Pet profile", () => {
  it.each([DOG, CAT])("renders $name with a Weight card", async (pet) => {
    prepare("full", { id: pet.id });
    await renderScreen(<PetProfileScreen />);
    expect(screen.getAllByText(pet.name).length).toBeGreaterThan(0);
    expect(screen.getByText("Weight")).toBeTruthy();
  });

  it("shows the sections and a plain Remove button", async () => {
    prepare("full", { id: DOG.id });
    await renderScreen(<PetProfileScreen />);
    for (const t of ["About", "Weight", "Vaccinations", "Vet visits", "Medications", "Remove Rex"]) {
      expect(screen.getByText(t)).toBeTruthy();
    }
    expect(screen.getAllByText(/Beagle/).length).toBeGreaterThan(0);
  });

  it("Add weight opens the log panel at the weight step", async () => {
    prepare("full", { id: DOG.id });
    await renderScreen(<PetProfileScreen />);
    fireEvent.press(screen.getByLabelText("Add weight"));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/log", params: { petId: DOG.id, step: "weight" } });
  });

  it("array id param is accepted", async () => {
    prepare("full", { id: [DOG.id] });
    await renderScreen(<PetProfileScreen />);
    expect(screen.getAllByText("Rex").length).toBeGreaterThan(0);
  });

  it("unknown pet shows the not-found state", async () => {
    prepare("full", { id: "ghost" });
    await renderScreen(<PetProfileScreen />);
    expect(screen.getByText("We can't find this pet")).toBeTruthy();
  });
});
