import { fireEvent, screen } from "@testing-library/react-native";
import PetProfileScreen from "@/app/pet/[id]/index";
import AddRecordSheet from "@/app/pet/[id]/add/[record]";
import EditPetSheet from "@/app/pet/[id]/edit";
import { CAT, DOG, fns } from "./_support/fakeData";
import { prepare, renderScreen } from "./_support/render";
import { router } from "./_support/routerMock";

describe("Pet profile", () => {
  it.each([DOG, CAT])("renders $name under a native title with a Weight card", async (pet) => {
    prepare("full", { id: pet.id });
    await renderScreen(<PetProfileScreen />);
    expect(screen.getByRole("header", { name: pet.name })).toBeTruthy();
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

  it("the add buttons and About open native form sheets", async () => {
    prepare("full", { id: DOG.id });
    await renderScreen(<PetProfileScreen />);
    fireEvent.press(screen.getByLabelText("Add vaccination"));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/pet/[id]/add/[record]", params: { id: DOG.id, record: "vaccination" } });
    fireEvent.press(screen.getByLabelText("Add vet visit"));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/pet/[id]/add/[record]", params: { id: DOG.id, record: "vet" } });
    fireEvent.press(screen.getByLabelText("Add medication"));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/pet/[id]/add/[record]", params: { id: DOG.id, record: "med" } });
    fireEvent.press(screen.getByLabelText("About Rex. Tap to edit"));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/pet/[id]/edit", params: { id: DOG.id } });
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

describe("Pet form sheets", () => {
  it("add vaccination: native date pickers, saves and closes", async () => {
    prepare("full", { id: DOG.id, record: "vaccination" });
    await renderScreen(<AddRecordSheet />);
    expect(screen.getByText("Add vaccination")).toBeTruthy();
    // "Given on" is a native picker; "Next due" is optional and starts empty.
    expect(screen.getByTestId("datetime-date")).toBeTruthy();
    expect(screen.getByLabelText("Set Next due")).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Vaccine"), "Rabies");
    fireEvent.press(screen.getByText("Save"));
    expect(router.back).toHaveBeenCalled();
    expect(fns.addVaccination).toHaveBeenCalledWith(expect.objectContaining({ petId: DOG.id, name: "Rabies", nextDue: null }));
  });

  it("add vet visit and medication render their forms", async () => {
    prepare("full", { id: DOG.id, record: "vet" });
    const vet = await renderScreen(<AddRecordSheet />);
    expect(screen.getByText("Add vet visit")).toBeTruthy();
    vet.unmount();
    prepare("full", { id: DOG.id, record: "med" });
    await renderScreen(<AddRecordSheet />);
    expect(screen.getByText("Add medication")).toBeTruthy();
  });

  it("edit pet: gender is a native menu, birthday a native date picker", async () => {
    prepare("full", { id: DOG.id });
    await renderScreen(<EditPetSheet />);
    expect(screen.getByText("About Rex")).toBeTruthy();
    expect(screen.getByTestId("datetime-date")).toBeTruthy();
    fireEvent.press(screen.getByRole("menuitem", { name: "Girl" }));
    fireEvent.press(screen.getByText("Save"));
    expect(fns.editPet).toHaveBeenCalledWith(DOG.id, expect.objectContaining({ gender: "female", name: "Rex" }));
  });
});
