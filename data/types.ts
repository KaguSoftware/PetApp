export type Species = "dog" | "cat" | "rabbit" | "bird" | "fish" | "reptile" | "hamster" | "other";
export type Role = "owner" | "admin" | "member";

export interface Pet {
  id: string;
  name: string;
  species: Species;
  breed: string | null;
  birthDate: string | null; // yyyy-mm-dd
  gender: "male" | "female" | null;
  weightKg: number | null;
  notes: string | null;
}

export type CareType = "fed" | "water" | "litter" | "walk" | "groomed" | "meds" | "vet";
export interface CareLog {
  id: string;
  petId: string;
  memberId: string | null;
  type: CareType;
  ts: number;
  note: string | null;
  grams: number | null;
  medId: string | null;
  durationMinutes: number | null;
}

export interface WeightEntry {
  id: string;
  petId: string;
  kg: number;
  ts: number;
}

export interface Vaccination {
  id: string;
  petId: string;
  name: string;
  date: string;
  nextDue: string | null;
  notes?: string | null;
}
export interface VetVisit {
  id: string;
  petId: string;
  date: string;
  reason: string;
  notes: string | null;
  vetName?: string | null;
}
export interface Med {
  id: string;
  petId: string;
  name: string;
  dose: string | null;
  schedule: string | null;
  active: boolean;
}

export interface PetNote {
  id: string;
  petId: string;
  memberId: string | null;
  kind: "note" | "symptom";
  body: string;
  ts: number;
}

export interface Member {
  id: string;
  name: string;
  emoji: string | null;
  userId: string | null;
  role: Role | null;
  isMe: boolean;
}

/** A member card (`members` row). */
export interface MemberCard {
  id: string;
  name: string;
  emoji: string | null;
}
/** A signed-in account in the household (`household_members` row); id = user id. */
export interface MemberLink {
  id: string;
  userId: string;
  role: Role | null;
  memberId: string | null;
}
