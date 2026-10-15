import {
  ageYearsFromDate,
  careLogPatchRow,
  careLogRow,
  dateToMs,
  medPatchRow,
  msToDate,
  petInsertRow,
  petPatchRow,
  toCareLog,
  toMed,
  toMemberLink,
  toNote,
  toPet,
  toVaccination,
  toVetVisit,
  toWeight,
  unitsFromDb,
  unitsToDb,
  vaccinationRow,
} from "../mappers";

describe("dates", () => {
  it("round-trips yyyy-mm-dd through epoch ms", () => {
    expect(msToDate(dateToMs("2026-03-29"))).toBe("2026-03-29");
    expect(msToDate(dateToMs("2026-10-25"))).toBe("2026-10-25");
  });

  it("computes whole years from a birth date", () => {
    const now = dateToMs("2026-06-01");
    expect(ageYearsFromDate("2024-05-01", now)).toBe(2);
    expect(ageYearsFromDate(null, now)).toBe(0);
  });
});

describe("pets", () => {
  it("maps a row, treating empty breed and zero weight as null", () => {
    const pet = toPet({ id: "p1", name: "Mochi", species: "cat", breed: "", sex: "female", weight_kg: 0, birth_date: "1700000000000", notes: null });
    expect(pet).toMatchObject({ id: "p1", species: "cat", breed: null, gender: "female", weightKg: null, notes: null });
    expect(pet.birthDate).toBe(msToDate(1700000000000));
  });

  it("falls back to 'other' for unknown species", () => {
    expect(toPet({ id: "p", name: "x", species: "dragon" }).species).toBe("other");
  });

  it("builds a minimal insert row", () => {
    const row = petInsertRow("p1", "h1", { name: "Rex", species: "dog", breed: null, birthDate: null, gender: null, weightKg: null, notes: null });
    expect(row).toMatchObject({ id: "p1", household_id: "h1", breed: "", sex: null, weight_kg: 0, birth_date: null });
    expect(Object.keys(row).sort()).toEqual(["birth_date", "breed", "household_id", "id", "name", "notes", "sex", "species", "weight_kg"]);
  });

  it("only emits columns present in the patch", () => {
    expect(petPatchRow({ name: "New" })).toEqual({ name: "New" });
    expect(petPatchRow({ gender: null, breed: null })).toEqual({ sex: null, breed: "" });
    expect(petPatchRow({ birthDate: "2020-01-01" })).toMatchObject({ birth_date: dateToMs("2020-01-01") });
  });
});

describe("activities", () => {
  it("maps nullable columns and string timestamps", () => {
    const log = toCareLog({ id: "a", pet_id: "p", member_id: null, type: "walk", ts: "1700000000000", grams: null, duration_minutes: 25 });
    expect(log).toEqual({ id: "a", petId: "p", memberId: null, type: "walk", ts: 1700000000000, note: null, grams: null, medId: null, durationMinutes: 25 });
  });

  it("omits note from the insert row when there is none", () => {
    const log = toCareLog({ id: "a", pet_id: "p", type: "fed", ts: 1 });
    expect("note" in careLogRow(log, "h", "u")).toBe(false);
    expect(careLogRow({ ...log, note: "hi" }, "h", "u")).toMatchObject({ note: "hi", household_id: "h", user_id: "u" });
  });

  it("maps patches to column names", () => {
    expect(careLogPatchRow({ durationMinutes: 10, note: null })).toEqual({ duration_minutes: 10, note: null });
  });
});

describe("weights, health, notes", () => {
  it("maps a weight", () => {
    expect(toWeight({ id: "w", pet_id: "p", ts: "5", kg: "4.2" })).toEqual({ id: "w", petId: "p", ts: 5, kg: 4.2 });
  });

  it("maps vaccination dates both ways", () => {
    const v = toVaccination({ id: "v", pet_id: "p", name: "Rabies", date_given: dateToMs("2026-01-05"), next_due: null, notes: null });
    expect(v).toMatchObject({ date: "2026-01-05", nextDue: null });
    expect(vaccinationRow({ ...v, nextDue: "2027-01-05" })).toMatchObject({ date_given: dateToMs("2026-01-05"), next_due: dateToMs("2027-01-05") });
  });

  it("maps vet visit reason and date", () => {
    expect(toVetVisit({ id: "x", pet_id: "p", ts: dateToMs("2026-02-02"), reason: null, vet_name: "Dr. A" })).toMatchObject({
      date: "2026-02-02",
      reason: "",
      vetName: "Dr. A",
    });
  });

  it("renames med columns and always reports active", () => {
    expect(toMed({ id: "m", pet_id: "p", name: "Pill", dosage: "5mg", frequency: null })).toEqual({
      id: "m",
      petId: "p",
      name: "Pill",
      dose: "5mg",
      schedule: null,
      active: true,
    });
    expect(medPatchRow({ dose: "10mg", active: false })).toEqual({ dosage: "10mg" });
  });

  it("normalises note kind", () => {
    expect(toNote({ id: "n", pet_id: "p", kind: "symptom", body: "limp", ts: 1 }).kind).toBe("symptom");
    expect(toNote({ id: "n", pet_id: "p", kind: "weird", body: "x", ts: 1 }).kind).toBe("note");
  });
});

describe("sharing and units", () => {
  it("lowercases roles and drops unknown ones", () => {
    expect(toMemberLink({ user_id: "u", role: "Owner", member_id: "m" })).toEqual({ id: "u", userId: "u", role: "owner", memberId: "m" });
    expect(toMemberLink({ user_id: "u", role: "boss", member_id: null }).role).toBeNull();
  });

  it("converts units", () => {
    expect(unitsFromDb("lb")).toBe("imperial");
    expect(unitsFromDb("kg")).toBe("metric");
    expect(unitsToDb("imperial")).toBe("lb");
  });
});
