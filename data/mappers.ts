import type {
  CareLog,
  CareType,
  Med,
  MemberCard,
  MemberLink,
  Pet,
  PetNote,
  Role,
  Species,
  Vaccination,
  VetVisit,
  WeightEntry,
} from "./types";

// Pure row <-> type conversions. DB timestamps are bigint epoch ms (PostgREST
// may hand them back as strings), dates in the contract are yyyy-mm-dd.

export type Row = Record<string, unknown>;

const SPECIES: readonly Species[] = ["dog", "cat", "rabbit", "bird", "fish", "reptile", "hamster", "other"];
const CARE_TYPES: readonly CareType[] = ["fed", "water", "litter", "walk", "groomed", "meds", "vet"];
const ROLES: readonly Role[] = ["owner", "admin", "member"];

const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function msToDate(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local noon, so a DST shift can never move the calendar day. */
export function dateToMs(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 12).getTime();
}

const nullableDate = (v: unknown): string | null => {
  const ms = num(v);
  return ms === null ? null : msToDate(ms);
};

export function ageYearsFromDate(date: string | null, now = Date.now()): number {
  if (!date) return 0;
  return Math.max(0, Math.floor((now - dateToMs(date)) / (365.25 * 86_400_000)));
}

export function speciesEmoji(species: Species): string {
  return species === "cat" ? "\u{1F431}" : species === "dog" ? "\u{1F436}" : "\u{1F43E}";
}

// pets ------------------------------------------------------------------------

export function toPet(r: Row): Pet {
  const species = SPECIES.includes(r.species as Species) ? (r.species as Species) : "other";
  const weight = num(r.weight_kg);
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    species,
    breed: str(r.breed),
    birthDate: nullableDate(r.birth_date),
    gender: r.sex === "male" || r.sex === "female" ? r.sex : null,
    // weight_kg is NOT NULL in the old schema; 0 means "never entered".
    weightKg: weight !== null && weight > 0 ? weight : null,
    notes: str(r.notes),
  };
}

/**
 * Only the columns every pet has. If inserts start failing with 23502 (a NOT NULL
 * column without a default, e.g. owned/equipped/cup_grams/gradient_*), add the
 * missing defaults server-side rather than sending them from here.
 */
export function petInsertRow(id: string, householdId: string, p: Omit<Pet, "id">): Row {
  return {
    id,
    household_id: householdId,
    name: p.name,
    species: p.species,
    breed: p.breed ?? "",
    sex: p.gender,
    birth_date: p.birthDate ? dateToMs(p.birthDate) : null,
    notes: p.notes,
    weight_kg: p.weightKg ?? 0,
  };
}

export function petPatchRow(patch: Partial<Omit<Pet, "id">>): Row {
  const row: Row = {};
  if ("name" in patch) row.name = patch.name;
  if ("species" in patch && patch.species) {
    row.species = patch.species;
    row.emoji = speciesEmoji(patch.species);
  }
  if ("breed" in patch) row.breed = patch.breed ?? "";
  if ("gender" in patch) row.sex = patch.gender ?? null;
  if ("birthDate" in patch) {
    row.birth_date = patch.birthDate ? dateToMs(patch.birthDate) : null;
    row.age_years = ageYearsFromDate(patch.birthDate ?? null);
  }
  if ("weightKg" in patch) row.weight_kg = patch.weightKg ?? 0;
  if ("notes" in patch) row.notes = patch.notes ?? null;
  return row;
}

// activities ------------------------------------------------------------------

export function toCareLog(r: Row): CareLog {
  return {
    id: String(r.id),
    petId: String(r.pet_id),
    memberId: str(r.member_id),
    type: CARE_TYPES.includes(r.type as CareType) ? (r.type as CareType) : "fed",
    ts: Number(r.ts),
    note: str(r.note),
    grams: num(r.grams),
    medId: str(r.med_id),
    durationMinutes: num(r.duration_minutes),
  };
}

export function careLogRow(log: CareLog, householdId: string, userId: string | null): Row {
  const row: Row = {
    id: log.id,
    household_id: householdId,
    pet_id: log.petId,
    member_id: log.memberId,
    user_id: userId,
    type: log.type,
    ts: log.ts,
    grams: log.grams,
    med_id: log.medId,
    duration_minutes: log.durationMinutes,
  };
  // Only sent when present so a note-less log never depends on the column.
  if (log.note !== null) row.note = log.note;
  return row;
}

export function careLogPatchRow(patch: Partial<Pick<CareLog, "note" | "grams" | "durationMinutes" | "ts">>): Row {
  const row: Row = {};
  if ("note" in patch) row.note = patch.note ?? null;
  if ("grams" in patch) row.grams = patch.grams ?? null;
  if ("durationMinutes" in patch) row.duration_minutes = patch.durationMinutes ?? null;
  if ("ts" in patch) row.ts = patch.ts;
  return row;
}

// weights ---------------------------------------------------------------------

export const toWeight = (r: Row): WeightEntry => ({
  id: String(r.id),
  petId: String(r.pet_id),
  kg: Number(r.kg),
  ts: Number(r.ts),
});

// health ----------------------------------------------------------------------

export const toVaccination = (r: Row): Vaccination => ({
  id: String(r.id),
  petId: String(r.pet_id),
  name: String(r.name ?? ""),
  date: msToDate(Number(r.date_given)),
  nextDue: nullableDate(r.next_due),
  notes: str(r.notes),
});

export const vaccinationRow = (v: Vaccination): Row => ({
  id: v.id,
  pet_id: v.petId,
  name: v.name,
  date_given: dateToMs(v.date),
  next_due: v.nextDue ? dateToMs(v.nextDue) : null,
  notes: v.notes ?? null,
});

export const toVetVisit = (r: Row): VetVisit => ({
  id: String(r.id),
  petId: String(r.pet_id),
  date: msToDate(Number(r.ts)),
  reason: typeof r.reason === "string" ? r.reason : "",
  notes: str(r.notes),
  vetName: str(r.vet_name),
});

export const vetVisitRow = (v: VetVisit): Row => ({
  id: v.id,
  pet_id: v.petId,
  ts: dateToMs(v.date),
  reason: v.reason || null,
  notes: v.notes,
  vet_name: v.vetName ?? null,
});

// The meds table has no `active` column; every stored med is active.
export const toMed = (r: Row): Med => ({
  id: String(r.id),
  petId: String(r.pet_id),
  name: String(r.name ?? ""),
  dose: str(r.dosage),
  schedule: str(r.frequency),
  active: true,
});

export const medRow = (m: Med): Row => ({
  id: m.id,
  pet_id: m.petId,
  name: m.name,
  dosage: m.dose,
  frequency: m.schedule,
});

export function medPatchRow(patch: Partial<Omit<Med, "id" | "petId">>): Row {
  const row: Row = {};
  if ("name" in patch) row.name = patch.name;
  if ("dose" in patch) row.dosage = patch.dose ?? null;
  if ("schedule" in patch) row.frequency = patch.schedule ?? null;
  return row;
}

// notes -----------------------------------------------------------------------

export const toNote = (r: Row): PetNote => ({
  id: String(r.id),
  petId: String(r.pet_id),
  memberId: str(r.member_id),
  kind: r.kind === "symptom" ? "symptom" : "note",
  body: String(r.body ?? ""),
  ts: Number(r.ts),
});

// sharing ---------------------------------------------------------------------

export const toMemberCard = (r: Row): MemberCard => ({
  id: String(r.id),
  name: String(r.name ?? ""),
  emoji: str(r.emoji),
});

const asRole = (v: unknown): Role | null => {
  const s = typeof v === "string" ? v.toLowerCase() : "";
  return ROLES.includes(s as Role) ? (s as Role) : null;
};

export const toMemberLink = (r: Row): MemberLink => ({
  id: String(r.user_id),
  userId: String(r.user_id),
  role: asRole(r.role),
  memberId: str(r.member_id),
});

export const unitsFromDb = (v: unknown): "metric" | "imperial" => (v === "lb" ? "imperial" : "metric");
export const unitsToDb = (u: "metric" | "imperial"): "kg" | "lb" => (u === "imperial" ? "lb" : "kg");
