import { screen } from "@testing-library/react-native";
import PetProfileScreen from "@/app/pet/[id]";
import { CAT, DOG } from "./_support/fakeData";
import { prepare, renderScreen } from "./_support/render";

describe("Pet profile", () => {
  it.each([DOG, CAT])("renders $name with a Weight card", async (pet) => {
    prepare("full", { id: pet.id });
    await renderScreen(<PetProfileScreen />);
    expect(screen.getAllByText(pet.name).length).toBeGreaterThan(0);
    expect(screen.getByText("Weight")).toBeTruthy();
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
