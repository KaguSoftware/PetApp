export type ActionType = "fed" | "water" | "litter" | "walk" | "groomed" | "meds" | "vet";

export type CosmeticSlot = "head" | "face" | "neck" | "body";

export interface Cosmetic {
  id: string;
  name: string;
  emoji: string;
  price: number;
  slot: CosmeticSlot;
}

export interface WeightPoint {
  id: string;
  ts: number;
  kg: number;
}

export interface Supply {
  id: string;
  name: string;
  icon: string; // IconName (kept as string to avoid a data↔icons import cycle)
  level: number; // 0-100
}

export interface Med {
  id: string;
  name: string;
  dosage?: string;
  frequency?: string;
}

export interface Vaccination {
  id: string;
  petId: string;
  name: string;
  /** ms epoch */
  dateGiven: number;
  /** ms epoch — when the next shot/booster is due, if known */
  nextDue?: number;
  notes?: string;
}

export interface VetVisit {
  id: string;
  petId: string;
  /** ms epoch — when the visit happened */
  ts: number;
  vetName?: string;
  reason?: string;
  notes?: string;
}

export interface Pet {
  id: string;
  name: string;
  species: "cat" | "dog";
  breed: string;
  sex?: "male" | "female";
  emoji: string;
  ageYears: number;
  weightKg: number;
  owned: string[];
  equipped: Partial<Record<CosmeticSlot, string>>;
  gradient: [string, string];
  weights: WeightPoint[];
  supplies: Supply[];
  meds: Med[];
  vaccinations: Vaccination[];
  vetVisits: VetVisit[];
  /** ms epoch when the pet row was created — the "gotcha day" milestone. */
  createdAt: number;
  /** ms epoch. When set, ageYears is derived from it at hydration. */
  birthDate?: number;
  microchip?: string;
  allergies?: string;
  notes?: string;
  /** Grams in one full cup of food — used to size the Fed portion picker. */
  cupGrams: number;
  /** User-entered daily targets for a pet whose breed has no CARE_PLANS entry
   *  (e.g. a custom/"Other" breed). Any key present overrides the matching
   *  species-default target; absent keys still fall back normally. */
  customPlan?: {
    fedPerDay?: number;
    fedGrams?: number;
    waterPerDay?: number;
    litterPerDay?: number;
    walkPerDay?: number;
    /** User-edited frequencies for the non-daily "other" care activities
     *  (grooming, dental, vet checkup, …), keyed by the activity's stable id.
     *  Absent keys fall back to the default cadence for that activity. */
    cadences?: Record<string, string>;
  };
}

export interface Member {
  id: string;
  name: string;
  emoji: string;
  role: string;
  gradient: [string, string];
  /** /settings → Notifications toggles — per-member, not shared by the household. Mutes a category of simulated toast without touching the underlying reminders/alerts. */
  notifyCareReminders: boolean;
  notifyFamilyActivity: boolean;
  notifyVetSuggestions: boolean;
}

// The only role that carries functionality: it grants access to the
// Family ID + password section on the Family tab. Every other role is
// free-text and purely cosmetic.
export const ADMIN_ROLE = "Admin";
// Roles that grant admin access (Family ID + password). The signup DB trigger
// seeds the account owner as "Owner" while the client-side bootstrap uses
// "Admin", so both must count as admin — otherwise a real signup can't manage
// its own Family ID.
const ADMIN_ROLES = new Set(["admin", "owner"]);
export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.has(role.trim().toLowerCase());
}

export interface Activity {
  id: string;
  petId: string;
  memberId: string;
  type: ActionType;
  ts: number;
  note?: string;
  /** Grams fed — set only for "fed" activities logged through the portion picker. */
  grams?: number;
}

/** Portion choices offered by the Fed picker, as a fraction of one full cup. */
export const PORTIONS: { value: "0.25" | "0.5" | "0.75" | "1"; label: string; frac: number }[] = [
  { value: "0.25", label: "¼ cup", frac: 0.25 },
  { value: "0.5", label: "½ cup", frac: 0.5 },
  { value: "0.75", label: "¾ cup", frac: 0.75 },
  { value: "1", label: "1 cup", frac: 1 },
];

export interface Reminder {
  id: string;
  petId: string;
  title: string;
  emoji: string;
  due: number;
  done: boolean;
  source: "manual" | "plan";
  /** Auto-generated health alert (e.g. over/under-feeding) rather than a manual/plan reminder. */
  alert?: boolean;
  /** Vet suggested alongside an alert reminder, for a "Book vet" CTA. */
  vetId?: string;
  /** Care-warning kind (fed/water/litter/walk) for stable raise/resolve
   * matching that survives a pet rename. Only set on care-warning reminders. */
  alertKind?: string;
  /** Recurrence — on check-off the due date rolls forward instead of completing. */
  repeatKind?: RepeatKind;
  /** Days between occurrences; only used when repeatKind is "every_n_days". */
  repeatInterval?: number;
  /** Set on auto-created vaccine reminders — links back to the vaccination record. */
  vaccinationId?: string;
}

export type RepeatKind = "daily" | "weekly" | "every_n_days";

/** Next occurrence strictly after now, preserving the reminder's time-of-day. */
export function nextRepeatDue(due: number, kind: RepeatKind, interval?: number, now: number = Date.now()): number {
  const stepDays = kind === "daily" ? 1 : kind === "weekly" ? 7 : Math.max(1, Math.round(interval ?? 1));
  const step = stepDays * 86_400_000;
  let next = due + step;
  while (next <= now) next += step;
  return next;
}

const YEAR_MS = 365.25 * 86_400_000;

export function ageYearsFromBirthDate(birthDateMs: number, now: number = Date.now()): number {
  return Math.max(0, (now - birthDateMs) / YEAR_MS);
}

/** The pet's next birthday (ms epoch) and the age it turns then. */
export function nextBirthday(birthDateMs: number, now: number = Date.now()): { date: number; turns: number } {
  const birth = new Date(birthDateMs);
  const d = new Date(now);
  const candidate = new Date(d.getFullYear(), birth.getMonth(), birth.getDate());
  if (candidate.getTime() <= now) candidate.setFullYear(candidate.getFullYear() + 1);
  return { date: candidate.getTime(), turns: candidate.getFullYear() - birth.getFullYear() };
}

/** The next anniversary (ms epoch) of a starting date — used for "gotcha day". */
export function nextAnniversary(startMs: number, now: number = Date.now()): number {
  const start = new Date(startMs);
  const d = new Date(now);
  const candidate = new Date(d.getFullYear(), start.getMonth(), start.getDate());
  if (candidate.getTime() <= now) candidate.setFullYear(candidate.getFullYear() + 1);
  return candidate.getTime();
}

export interface AppState {
  currentMemberId: string;
  premium: boolean;
  coins: number;
  streak: number;
  pets: Pet[];
  members: Member[];
  activities: Activity[];
  reminders: Reminder[];
  bookedVet: boolean;
  bookedVetIds: string[];
  seenWelcome: boolean;
  units: "kg" | "lb";
  /** Household id, shown to the family as a shareable "Family ID". */
  familyId: string;
  /** Whether the family admin has set a password — the hash itself never reaches client state. */
  familyPasswordSet: boolean;
  /** Every household this user belongs to (for the household switcher). */
  households: { id: string; name: string }[];
  /** The household currently loaded on-screen (one of `households`). */
  activeHouseholdId: string;
}

export const ACTIONS: Record<ActionType, { label: string; emoji: string; verb: string }> = {
  fed: { label: "Fed", emoji: "🍖", verb: "fed" },
  water: { label: "Water", emoji: "💧", verb: "gave water to" },
  litter: { label: "Litter", emoji: "🧹", verb: "cleaned the litter for" },
  walk: { label: "Walk", emoji: "🦮", verb: "walked" },
  groomed: { label: "Groomed", emoji: "✂️", verb: "groomed" },
  meds: { label: "Meds", emoji: "💊", verb: "gave meds to" },
  vet: { label: "Vet", emoji: "🩺", verb: "took to the vet" },
};

export const COSMETICS: Cosmetic[] = [
  { id: "tophat", name: "Top Hat", emoji: "🎩", price: 120, slot: "head" },
  { id: "crown", name: "Royal Crown", emoji: "👑", price: 250, slot: "head" },
  { id: "cap", name: "Baseball Cap", emoji: "🧢", price: 60, slot: "head" },
  { id: "party", name: "Party Hat", emoji: "🥳", price: 80, slot: "head" },
  { id: "santa", name: "Cozy Beanie", emoji: "🎅", price: 90, slot: "head" },
  { id: "sunglasses", name: "Cool Shades", emoji: "🕶️", price: 70, slot: "face" },
  { id: "glasses", name: "Smart Glasses", emoji: "👓", price: 50, slot: "face" },
  { id: "monocle", name: "Monocle", emoji: "🧐", price: 110, slot: "face" },
  { id: "bowtie", name: "Bow Tie", emoji: "🎀", price: 45, slot: "neck" },
  { id: "scarf", name: "Winter Scarf", emoji: "🧣", price: 65, slot: "neck" },
  { id: "medal", name: "Good Pet Medal", emoji: "🏅", price: 150, slot: "neck" },
  { id: "tux", name: "Tiny Tuxedo", emoji: "🤵", price: 300, slot: "body" },
  { id: "shirt", name: "Hawaiian Shirt", emoji: "👕", price: 85, slot: "body" },
  { id: "cape", name: "Hero Cape", emoji: "🦸", price: 200, slot: "body" },
];

export interface Vet {
  id: string;
  name: string;
  clinic: string;
  rating: number;
  distanceKm: number;
  gradient: [string, string];
  sponsored: boolean;
  specialties: string[];
  openNow: boolean;
}

export const VETS: Vet[] = [
  {
    id: "chen",
    name: "Dr. Sarah Chen",
    clinic: "Sunny Paws Veterinary Clinic",
    rating: 4.9,
    distanceKm: 2.3,
    gradient: ["oklch(0.6 0.13 200)", "oklch(0.48 0.13 240)"],
    sponsored: true,
    specialties: ["General", "Dental", "Cats"],
    openNow: true,
  },
  {
    id: "okoro",
    name: "Dr. James Okoro",
    clinic: "Riverside Animal Hospital",
    rating: 4.8,
    distanceKm: 3.1,
    gradient: ["oklch(0.64 0.14 150)", "oklch(0.5 0.13 175)"],
    sponsored: true,
    specialties: ["Surgery", "Dogs", "Orthopedics"],
    openNow: true,
  },
  {
    id: "patel",
    name: "Dr. Anaya Patel",
    clinic: "Little Whiskers Clinic",
    rating: 4.7,
    distanceKm: 4.6,
    gradient: ["oklch(0.68 0.15 350)", "oklch(0.56 0.17 20)"],
    sponsored: false,
    specialties: ["General", "Nutrition"],
    openNow: false,
  },
  {
    id: "mueller",
    name: "Dr. Lena Müller",
    clinic: "Parkside Pet Care",
    rating: 4.6,
    distanceKm: 5.9,
    gradient: ["oklch(0.7 0.14 85)", "oklch(0.6 0.16 55)"],
    sponsored: false,
    specialties: ["Vaccination", "Exotics"],
    openNow: true,
  },
];

/** Primary suggested vet used by dashboard insight cards. */
export const VET = VETS[0];

export interface PlanItem {
  emoji: string;
  title: string;
  detail: string;
  cadence: string;
  perDay?: number;
  action?: ActionType;
  /** Structured daily gram target for feeding items (alongside the prose in `detail`). */
  perDayGrams?: number;
}

/** Recognized breed picklist per species, offered as autocomplete when adding a pet.
    Typing anything else is still allowed — it just falls back to species-default
    care targets instead of a breed-specific plan (see dailyTarget/dailyGramTarget). */
export const DOG_BREEDS: string[] = [
  "Labrador Retriever",
  "French Bulldog",
  "German Shepherd",
  "Golden Retriever",
  "Poodle",
  "Bulldog",
  "Beagle",
  "Rottweiler",
];

export const CAT_BREEDS: string[] = [
  "Stray Cat",
  "Persian",
  "Maine Coon",
  "Siamese",
  "British Shorthair",
  "Ragdoll",
  "Bengal",
  "Scottish Fold",
];

export const BREEDS_BY_SPECIES: Record<"cat" | "dog", string[]> = {
  cat: CAT_BREEDS,
  dog: DOG_BREEDS,
};

export const CARE_PLANS: Record<string, { intro: string; items: PlanItem[] }> = {
  "British Shorthair": {
    intro:
      "Vet-built plan for a British Shorthair. This breed loves food and gains weight easily, so strict portion control is everything — see the weight & feeding guide below for age/gender-specific amounts.",
    items: [
      { emoji: "🍖", title: "Feeding", detail: "Strict portion-controlled meals — avoid free-feeding, this breed overeats readily.", cadence: "2× daily", perDay: 2, action: "fed" },
      { emoji: "💧", title: "Fresh water", detail: "Clean water refreshed daily.", cadence: "Daily", perDay: 1, action: "water" },
      { emoji: "🧹", title: "Litter box maintenance", detail: "Daily scooping and a routine full litter change every 2-4 weeks.", cadence: "1× daily", perDay: 1, action: "litter" },
      { emoji: "🧶", title: "Play & mental stimulation", detail: "Engaging daily play to encourage movement and combat their natural sedentary, lazy tendency.", cadence: "1-2× daily, 15-20 min" },
      { emoji: "✂️", title: "Brushing / grooming", detail: "Weekly brushing (more frequent in spring) to manage their incredibly dense, thick double coat.", cadence: "Weekly", action: "groomed" },
      { emoji: "🐾", title: "Nail trimming", detail: "Regular clipping to prevent overgrowth and snagging.", cadence: "Every 2-4 weeks" },
      { emoji: "🪥", title: "Dental care", detail: "Routine teeth cleaning, water additives, or dental treats.", cadence: "3-7× weekly" },
      { emoji: "⚖️", title: "Weight check", detail: "Frequent, strict monitoring to prevent obesity — see the weight & feeding guide below.", cadence: "1-2× monthly" },
      { emoji: "🛡️", title: "Parasite preventative", detail: "Routine flea, tick, and worm prevention.", cadence: "Monthly" },
      { emoji: "🩺", title: "Vet checkup", detail: "Annual wellness exams and vaccinations.", cadence: "Yearly", action: "vet" },
      { emoji: "💊", title: "Medication tracking", detail: "Log any prescribed medication from the veterinary clinic.", cadence: "1-3× daily as prescribed" },
    ],
  },
  "Golden Retriever": {
    intro:
      "Vet-built plan for a Golden Retriever. High-energy breed — exercise, ear care, and cancer screening are the priorities. See the weight & feeding guide below for age/gender-specific amounts.",
    items: [
      { emoji: "🍖", title: "Feeding", detail: "Portion-controlled meals, carefully measured to avoid their strong tendency toward obesity.", cadence: "2× daily", perDay: 2, action: "fed" },
      { emoji: "💧", title: "Fresh water", detail: "Constant access to clean water.", cadence: "Constant access", action: "water" },
      { emoji: "🦮", title: "Exercise & play", detail: "Moderate to high daily exercise (walking, fetch, swimming) to keep them physically fit and mentally satisfied.", cadence: "1-2× daily, 60-90 min", perDay: 2, action: "walk" },
      { emoji: "🚪", title: "Potty breaks", detail: "Regular daily opportunities to go outside.", cadence: "3-5× daily" },
      { emoji: "✂️", title: "Brushing / grooming", detail: "Frequent brushing with an undercoat rake to manage their heavy double coat and prevent matting.", cadence: "2-3× weekly", action: "groomed" },
      { emoji: "👂", title: "Ear cleaning", detail: "Mandatory weekly cleaning — their floppy ears trap moisture and are highly prone to infections.", cadence: "Weekly" },
      { emoji: "🛁", title: "Bathing", detail: "Occasional baths, or after muddy play.", cadence: "Every 6-8 weeks" },
      { emoji: "🐾", title: "Nail trimming", detail: "Regular clipping to maintain proper paw structure.", cadence: "Every 3-4 weeks" },
      { emoji: "🪥", title: "Dental care", detail: "Routine teeth brushing or dental chews.", cadence: "3-7× weekly" },
      { emoji: "⚖️", title: "Weight check", detail: "Strict routine monitoring to prevent obesity and protect joint health.", cadence: "1-2× monthly" },
      { emoji: "🛡️", title: "Parasite preventative", detail: "Routine tracking for heartworm, flea, and tick meds.", cadence: "Monthly" },
      { emoji: "🩺", title: "Vet checkup", detail: "Strong focus on cancer screenings (highly prevalent in this breed), cardiac exams, and joint health. Supplement with a monthly at-home check: feel for new lumps around the jaw, armpits, groin, and behind the knees.", cadence: "Yearly", action: "vet" },
      { emoji: "💊", title: "Medication tracking", detail: "Log any prescribed medication or joint supplements.", cadence: "Daily or as prescribed" },
    ],
  },
  "Labrador Retriever": {
    intro:
      "Vet-built plan for a Labrador Retriever. Food-motivated and prone to weight gain and bloat — portion control plus daily exercise keep them healthy. See the weight & feeding guide below for age/gender-specific amounts.",
    items: [
      { emoji: "🍖", title: "Feeding", detail: "Strict portion-controlled meals using a slow-feeder bowl to reduce bloat (GDV) risk. EMERGENCY: unproductive retching, a hard/swollen abdomen, restlessness, or rapid breathing need immediate emergency vet care — this can be fatal within hours.", cadence: "2× daily", perDay: 2, action: "fed" },
      { emoji: "💧", title: "Fresh water", detail: "Constant access to clean water, especially after their frequent, high-energy activities.", cadence: "Constant access", action: "water" },
      { emoji: "🦮", title: "Exercise & play", detail: "1-2 hours of vigorous daily exercise (retrieving, swimming) to manage high energy and prevent destructive behavior.", cadence: "1-2× daily, 60-120 min", perDay: 2, action: "walk" },
      { emoji: "🚪", title: "Potty breaks", detail: "Regular daily opportunities to go outside.", cadence: "3-5× daily" },
      { emoji: "✂️", title: "Brushing / grooming", detail: "Weekly brushing of their water-resistant double coat (more frequent during seasonal blows).", cadence: "1-2× weekly", action: "groomed" },
      { emoji: "🛁", title: "Bathing", detail: "Occasional baths — more frequent hose-downs likely due to their love of mud and water.", cadence: "Every 6-8 weeks" },
      { emoji: "🐾", title: "Nail trimming", detail: "Regular clipping to maintain proper paw structure.", cadence: "Every 3-4 weeks" },
      { emoji: "🪥", title: "Dental care", detail: "Routine teeth brushing or dental chews to prevent tartar buildup.", cadence: "3-7× weekly" },
      { emoji: "⚖️", title: "Weight check", detail: "Strict routine monitoring to prevent obesity, which exacerbates genetic predisposition to hip dysplasia.", cadence: "1-2× monthly" },
      { emoji: "🛡️", title: "Parasite preventative", detail: "Routine tracking for heartworm, flea, and tick meds.", cadence: "Monthly" },
      { emoji: "🩺", title: "Vet checkup", detail: "Specific screening for hip/elbow dysplasia and progressive retinal atrophy (PRA).", cadence: "Yearly", action: "vet" },
      { emoji: "💊", title: "Medication tracking", detail: "Log any prescribed medication or joint supplements (like glucosamine).", cadence: "Daily or as prescribed" },
    ],
  },
  "French Bulldog": {
    intro:
      "Vet-built plan for a French Bulldog. A brachycephalic breed — heat and airway management matter more than exercise volume. See the weight & feeding guide below for age/gender-specific amounts.",
    items: [
      { emoji: "🍖", title: "Feeding", detail: "Portion-controlled meals based on their small size and low activity level.", cadence: "2× daily", perDay: 2, action: "fed" },
      { emoji: "💧", title: "Fresh water", detail: "Constant access to clean, cool water to help regulate body temperature.", cadence: "Constant access", action: "water" },
      { emoji: "🦮", title: "Walks", detail: "Short, low-impact daily walks. Avoid strenuous exercise or heat/humidity — highly prone to heatstroke. Use a harness, not a collar. HEAT EMERGENCY: stop and cool down immediately if heavy panting won't slow, gums turn blue/purple, drooling, or wobbliness appear — seek vet care right away.", cadence: "1-2× daily, 15-20 min", perDay: 2, action: "walk" },
      { emoji: "🚪", title: "Potty breaks", detail: "Regular daily opportunities to go outside.", cadence: "3-5× daily" },
      { emoji: "✂️", title: "Brushing / wrinkle cleaning", detail: "Minimal coat brushing, but daily cleaning of deep facial folds and the tail pocket is required to prevent skin infections.", cadence: "Daily wrinkle cleaning", action: "groomed" },
      { emoji: "🛁", title: "Bathing", detail: "Occasional baths as needed for hygiene.", cadence: "Every 4-6 weeks" },
      { emoji: "🐾", title: "Nail trimming", detail: "Frequent clipping — their low-activity lifestyle won't wear nails down naturally.", cadence: "Every 2-3 weeks" },
      { emoji: "🪥", title: "Dental care", detail: "Critical routine brushing — crowded jaws make them highly susceptible to dental disease.", cadence: "3-7× weekly" },
      { emoji: "⚖️", title: "Weight check", detail: "Routine monitoring — extra weight severely compromises their already restricted airways.", cadence: "1-2× monthly" },
      { emoji: "🛡️", title: "Parasite preventative", detail: "Routine tracking for heartworm, flea, and tick meds.", cadence: "Monthly" },
      { emoji: "🩺", title: "Vet checkup", detail: "Close monitoring of respiratory function (BOAS) and spinal health (IVDD).", cadence: "Yearly", action: "vet" },
      { emoji: "💊", title: "Medication tracking", detail: "Log any prescribed medication, allergy treatments, or eye drops.", cadence: "1-3× daily as prescribed" },
    ],
  },
  "German Shepherd": {
    intro:
      "Vet-built plan for a German Shepherd. Large, high-drive working breed — needs real exercise, bloat precautions, and joint monitoring. See the weight & feeding guide below for age/gender-specific amounts.",
    items: [
      { emoji: "🍖", title: "Feeding", detail: "Large-breed portion-controlled meals. Rest 1-2 hours after eating to prevent bloat (GDV) — ask your vet whether a preventive gastropexy is appropriate. EMERGENCY: unproductive retching, a hard/swollen abdomen, restlessness, or rapid breathing need immediate emergency vet care.", cadence: "2× daily", perDay: 2, action: "fed" },
      { emoji: "💧", title: "Fresh water", detail: "Constant access to clean water.", cadence: "Constant access", action: "water" },
      { emoji: "🦮", title: "Exercise & play", detail: "1-2 hours of vigorous exercise and intense mental stimulation (training, puzzle toys, scent work) daily to prevent anxiety and destructive behaviors.", cadence: "1-2× daily, 60-120 min", perDay: 2, action: "walk" },
      { emoji: "🚪", title: "Potty breaks", detail: "Regular daily opportunities to go outside.", cadence: "3-5× daily" },
      { emoji: "✂️", title: "Brushing / grooming", detail: "Frequent brushing to manage heavy shedding from their dense double coat — daily during seasonal shedding.", cadence: "2-3× weekly", action: "groomed" },
      { emoji: "🛁", title: "Bathing", detail: "Occasional baths to preserve natural skin oils.", cadence: "Every 8-12 weeks" },
      { emoji: "🐾", title: "Nail trimming", detail: "Regular clipping to maintain proper walking mechanics.", cadence: "Every 3-4 weeks" },
      { emoji: "🪥", title: "Dental care", detail: "Routine teeth brushing or dental chews.", cadence: "3-7× weekly" },
      { emoji: "⚖️", title: "Weight check", detail: "Routine monitoring to keep them lean and minimize stress on hips and elbows.", cadence: "Monthly" },
      { emoji: "🛡️", title: "Parasite preventative", detail: "Routine tracking for heartworm, flea, and tick meds.", cadence: "Monthly" },
      { emoji: "🩺", title: "Vet checkup", detail: "Hip and elbow dysplasia screening, plus checking for degenerative myelopathy.", cadence: "Yearly", action: "vet" },
      { emoji: "💊", title: "Medication tracking", detail: "Log any prescribed medication, especially joint support supplements.", cadence: "Daily or as prescribed" },
    ],
  },
  "Poodle": {
    intro:
      "Vet-built plan for a Poodle (Standard/Miniature/Toy). Smart, active, and low-shedding — daily grooming and mental stimulation are the priorities. See the weight & feeding guide below for age/gender-specific amounts.",
    items: [
      { emoji: "🍖", title: "Feeding", detail: "Portion-controlled meals appropriate for their specific size variety.", cadence: "2× daily", perDay: 2, action: "fed" },
      { emoji: "💧", title: "Fresh water", detail: "Constant access to clean water.", cadence: "Constant access", action: "water" },
      { emoji: "🦮", title: "Exercise & play", detail: "Daily physical exercise combined with advanced mental stimulation (trick training, agility) to satisfy their highly intelligent, active nature.", cadence: "1-2× daily, 30-60 min", perDay: 2, action: "walk" },
      { emoji: "🚪", title: "Potty breaks", detail: "Regular daily opportunities to go outside.", cadence: "3-5× daily" },
      { emoji: "✂️", title: "Brushing / grooming", detail: "Daily brushing to the skin to prevent severe matting in their curly, non-shedding hair. Professional grooming and clipping required every 4-6 weeks.", cadence: "Daily; pro-groom every 4-6 weeks", action: "groomed" },
      { emoji: "🛁", title: "Bathing", detail: "Regular bathing tied to the grooming schedule.", cadence: "Every 4-6 weeks" },
      { emoji: "🐾", title: "Nail trimming", detail: "Regular clipping to maintain proper paw structure.", cadence: "Every 3-4 weeks" },
      { emoji: "🪥", title: "Dental care", detail: "Strict routine brushing — smaller Poodles are exceptionally prone to severe periodontal disease.", cadence: "3-7× weekly" },
      { emoji: "⚖️", title: "Weight check", detail: "Routine monitoring to ensure a healthy body condition.", cadence: "Monthly" },
      { emoji: "🛡️", title: "Parasite preventative", detail: "Routine tracking for heartworm, flea, and tick meds.", cadence: "Monthly" },
      { emoji: "🩺", title: "Vet checkup", detail: "Screening for Addison's disease, eye issues, and joint luxation (in smaller varieties).", cadence: "Yearly", action: "vet" },
      { emoji: "💊", title: "Medication tracking", detail: "Log any prescribed medication.", cadence: "1-3× daily as prescribed" },
    ],
  },
  "Bulldog": {
    intro:
      "Vet-built plan for an English Bulldog. Another brachycephalic breed — heat sensitivity, bloat, and joint load are the main concerns. See the weight & feeding guide below for age/gender-specific amounts.",
    items: [
      { emoji: "🍖", title: "Feeding", detail: "Strict portion control — highly prone to obesity and bloat.", cadence: "2× daily", perDay: 2, action: "fed" },
      { emoji: "💧", title: "Fresh water", detail: "Constant access to cool water.", cadence: "Constant access", action: "water" },
      { emoji: "🦮", title: "Exercise & play", detail: "Very light, short walks in cool temperatures — low heat tolerance from brachycephalic anatomy. Never leave unattended near deep water (they cannot swim). HEAT EMERGENCY: stop and cool down immediately if heavy panting won't slow, gums turn blue/purple, drooling, or wobbliness appear — seek vet care right away.", cadence: "1-2× daily, 15-20 min", perDay: 2, action: "walk" },
      { emoji: "🚪", title: "Potty breaks", detail: "Regular daily opportunities to go outside.", cadence: "3-5× daily" },
      { emoji: "✂️", title: "Brushing / wrinkle cleaning", detail: "Minimal coat brushing, but rigorous daily cleaning and drying of deep facial wrinkles and the tail pocket to prevent yeast/bacterial infections.", cadence: "Daily wrinkle cleaning", action: "groomed" },
      { emoji: "🛁", title: "Bathing", detail: "Occasional baths with gentle, hypoallergenic shampoo to soothe sensitive skin.", cadence: "Every 4-8 weeks" },
      { emoji: "🐾", title: "Nail trimming", detail: "Frequent clipping — they don't exercise enough to naturally wear down nails.", cadence: "Every 2-3 weeks" },
      { emoji: "🪥", title: "Dental care", detail: "Routine brushing — their undershot jaw leads to overcrowding and tartar buildup.", cadence: "3-7× weekly" },
      { emoji: "⚖️", title: "Weight check", detail: "Critical routine monitoring — excess weight drastically worsens breathing and joint issues.", cadence: "1-2× monthly" },
      { emoji: "🛡️", title: "Parasite preventative", detail: "Routine tracking for heartworm, flea, and tick meds.", cadence: "Monthly" },
      { emoji: "🩺", title: "Vet checkup", detail: "Focus on respiratory, skin, and joint health.", cadence: "Yearly", action: "vet" },
      { emoji: "💊", title: "Medication tracking", detail: "Log skin ointments, eye drops (for cherry eye), or joint medications.", cadence: "1-3× daily as prescribed" },
    ],
  },
  "Beagle": {
    intro:
      "Vet-built plan for a Beagle. Scent-driven and food-motivated — portion discipline and secure, leashed walks matter most. See the weight & feeding guide below for age/gender-specific amounts.",
    items: [
      { emoji: "🍖", title: "Feeding", detail: "Strict portion-controlled meals in securely stored bins — notorious scavengers, highly prone to obesity.", cadence: "2× daily", perDay: 2, action: "fed" },
      { emoji: "💧", title: "Fresh water", detail: "Constant access to clean water.", cadence: "Constant access", action: "water" },
      { emoji: "🦮", title: "Exercise & play", detail: "Daily leashed walks or secure fenced-yard play — their strong scent-hound instinct means they must stay on a leash to avoid wandering off after a scent.", cadence: "1-2× daily, 45-60 min", perDay: 2, action: "walk" },
      { emoji: "🚪", title: "Potty breaks", detail: "Regular daily opportunities to go outside.", cadence: "3-5× daily" },
      { emoji: "✂️", title: "Brushing / grooming", detail: "Weekly brushing with a hound glove to manage moderate shedding.", cadence: "Weekly", action: "groomed" },
      { emoji: "👂", title: "Ear cleaning", detail: "Essential weekly cleaning to prevent infections in their long, floppy ears.", cadence: "Weekly" },
      { emoji: "🛁", title: "Bathing", detail: "Occasional baths, typically only when they roll in something smelly.", cadence: "Every 8-12 weeks" },
      { emoji: "🐾", title: "Nail trimming", detail: "Regular clipping to maintain proper paw structure.", cadence: "Every 3-4 weeks" },
      { emoji: "🪥", title: "Dental care", detail: "Routine teeth brushing or dental chews.", cadence: "3-7× weekly" },
      { emoji: "⚖️", title: "Weight check", detail: "Frequent, strict monitoring to prevent rapid weight gain.", cadence: "1-2× monthly" },
      { emoji: "🛡️", title: "Parasite preventative", detail: "Routine tracking for heartworm, flea, and tick meds.", cadence: "Monthly" },
      { emoji: "🩺", title: "Vet checkup", detail: "Monitoring for epilepsy, hypothyroidism, and eye disorders.", cadence: "Yearly", action: "vet" },
      { emoji: "💊", title: "Medication tracking", detail: "Log any prescribed medication.", cadence: "1-3× daily as prescribed" },
    ],
  },
  "Rottweiler": {
    intro:
      "Vet-built plan for a Rottweiler. Large, powerful breed — structured exercise, bloat precautions, and joint/cardiac care are the priorities. See the weight & feeding guide below for age/gender-specific amounts.",
    items: [
      { emoji: "🍖", title: "Feeding", detail: "Large-breed portion-controlled meals, divided into multiple smaller meals. Avoid exercise immediately before or after eating to prevent bloat (GDV).", cadence: "2× daily", perDay: 2, action: "fed" },
      { emoji: "💧", title: "Fresh water", detail: "Constant access to clean water.", cadence: "Constant access", action: "water" },
      { emoji: "🦮", title: "Exercise & training", detail: "Significant daily exercise (brisk walks, working tasks) combined with ongoing obedience training to channel their strength and drive positively.", cadence: "1-2× daily, 60-120 min", perDay: 2, action: "walk" },
      { emoji: "🚪", title: "Potty breaks", detail: "Regular daily opportunities to go outside.", cadence: "3-5× daily" },
      { emoji: "✂️", title: "Brushing / grooming", detail: "Weekly brushing to manage shedding of their short, dense double coat.", cadence: "Weekly", action: "groomed" },
      { emoji: "🛁", title: "Bathing", detail: "Occasional baths as needed.", cadence: "Every 8-12 weeks" },
      { emoji: "🐾", title: "Nail trimming", detail: "Regular clipping to maintain proper structural support for their heavy frame.", cadence: "Every 3-4 weeks" },
      { emoji: "🪥", title: "Dental care", detail: "Routine teeth brushing to prevent tartar buildup.", cadence: "3-7× weekly" },
      { emoji: "⚖️", title: "Weight check", detail: "Routine monitoring to keep them lean and minimize stress on their joints.", cadence: "Monthly" },
      { emoji: "🛡️", title: "Parasite preventative", detail: "Routine tracking for heartworm, flea, and tick meds.", cadence: "Monthly" },
      { emoji: "🩺", title: "Vet checkup", detail: "Focus on cardiac health (aortic stenosis), joint screening (hip/elbow dysplasia), and bone cancer awareness.", cadence: "Yearly", action: "vet" },
      { emoji: "💊", title: "Medication tracking", detail: "Log any prescribed medication or joint supplements.", cadence: "Daily or as prescribed" },
    ],
  },
  "Stray Cat": {
    intro:
      "Vet-built plan for an adopted/rescue cat. General-purpose care with extra attention to trust-building and a full health baseline early on. See the weight & feeding guide below for age/gender-specific amounts.",
    items: [
      { emoji: "🍖", title: "Feeding", detail: "Daily portion-controlled meals. Transition slowly to a high-quality commercial diet to prevent GI upset.", cadence: "2× daily", perDay: 2, action: "fed" },
      { emoji: "💧", title: "Fresh water", detail: "Clean water refreshed daily.", cadence: "Daily", perDay: 1, action: "water" },
      { emoji: "🧹", title: "Litter box maintenance", detail: "Daily scooping and a routine full litter change every 2-4 weeks.", cadence: "1× daily", perDay: 1, action: "litter" },
      { emoji: "🧶", title: "Play & mental stimulation", detail: "Gentle, interactive daily play to build trust, reduce anxiety, and prevent boredom.", cadence: "1-2× daily, 15-20 min" },
      { emoji: "✂️", title: "Brushing / grooming", detail: "Routine brushing to manage shedding and frequently assess skin condition.", cadence: "1-2× weekly", action: "groomed" },
      { emoji: "🐾", title: "Nail trimming", detail: "Regular clipping to prevent overgrowth, alongside providing proper scratching posts as they adapt to indoor life.", cadence: "Every 2-4 weeks" },
      { emoji: "🪥", title: "Dental care", detail: "Routine teeth cleaning, water additives, or dental treats.", cadence: "3-7× weekly" },
      { emoji: "⚖️", title: "Weight check", detail: "Routine monitoring to ensure steady, healthy weight gain if the cat was initially malnourished.", cadence: "Monthly" },
      { emoji: "🛡️", title: "Parasite preventative", detail: "Rigorous routine flea, tick, and worm prevention — strays are highly susceptible to parasites.", cadence: "Monthly" },
      { emoji: "🩺", title: "Vet checkup", detail: "An initial comprehensive screening for FIV/FeLV and core vaccinations is critical.", cadence: "Yearly", action: "vet" },
      { emoji: "💊", title: "Medication tracking", detail: "Log any prescribed medication (e.g. dewormers, antibiotics) from the veterinary clinic.", cadence: "1-3× daily as prescribed" },
    ],
  },
  "Persian": {
    intro:
      "Vet-built plan for a Persian. Long-haired and flat-faced (brachycephalic) — daily grooming and eye/airway care are the priorities. See the weight & feeding guide below for age/gender-specific amounts.",
    items: [
      { emoji: "🍖", title: "Feeding", detail: "Portion-controlled meals served in wide, shallow bowls or plates to accommodate their flat faces and make eating easier.", cadence: "2× daily", perDay: 2, action: "fed" },
      { emoji: "💧", title: "Fresh water", detail: "Clean water refreshed daily.", cadence: "Daily", perDay: 1, action: "water" },
      { emoji: "🧹", title: "Litter box maintenance", detail: "Daily scooping and a routine full litter change every 2-4 weeks.", cadence: "1× daily", perDay: 1, action: "litter" },
      { emoji: "🧶", title: "Play & mental stimulation", detail: "Gentle daily interactive play — typically laid-back and prefers low-impact activities.", cadence: "1× daily, 10-15 min" },
      { emoji: "✂️", title: "Brushing / grooming", detail: "Extensive daily combing and brushing is essential to prevent severe matting. Daily eye wiping is also required due to tear staining and shallow eye sockets.", cadence: "Daily, 10-15 min", action: "groomed" },
      { emoji: "🐾", title: "Nail trimming", detail: "Regular clipping to prevent overgrowth and snagging.", cadence: "Every 2-4 weeks" },
      { emoji: "🪥", title: "Dental care", detail: "Diligent brushing — their smushed anatomy often leads to overcrowded or misaligned teeth, increasing tartar buildup.", cadence: "3-7× weekly" },
      { emoji: "⚖️", title: "Weight check", detail: "Routine monitoring — flat-faced breeds are at higher risk for severe breathing issues if overweight.", cadence: "Monthly" },
      { emoji: "🛡️", title: "Parasite preventative", detail: "Routine flea, tick, and worm prevention.", cadence: "Monthly" },
      { emoji: "🩺", title: "Vet checkup", detail: "Focus on monitoring for breathing issues (BOAS) and Polycystic Kidney Disease (PKD).", cadence: "Yearly", action: "vet" },
      { emoji: "💊", title: "Medication tracking", detail: "Log any prescribed medication or eye drops from the veterinary clinic.", cadence: "1-3× daily as prescribed" },
    ],
  },
  "Maine Coon": {
    intro:
      "Vet-built plan for a Maine Coon. One of the largest cat breeds — bigger portions, joint care, and cardiac monitoring matter. See the weight & feeding guide below for age/gender-specific amounts.",
    items: [
      { emoji: "🍖", title: "Feeding", detail: "Portion-controlled, high-protein meals served in extra-wide bowls to prevent whisker fatigue.", cadence: "2× daily", perDay: 2, action: "fed" },
      { emoji: "💧", title: "Fresh water", detail: "Clean water refreshed daily — many prefer water fountains, as they love playing in moving water.", cadence: "Daily", perDay: 1, action: "water" },
      { emoji: "🧹", title: "Litter box maintenance", detail: "Daily scooping; requires an extra-large litter box to accommodate their massive size.", cadence: "1× daily", perDay: 1, action: "litter" },
      { emoji: "🧶", title: "Play & mental stimulation", detail: "Daily interactive play to keep them active and prevent boredom.", cadence: "1-2× daily, 15-30 min" },
      { emoji: "✂️", title: "Brushing / grooming", detail: "Routine brushing, especially their thick undercoat, to manage shedding and prevent oil buildup and mats.", cadence: "2-3× weekly", action: "groomed" },
      { emoji: "🐾", title: "Nail trimming", detail: "Regular clipping to prevent overgrowth and snagging.", cadence: "Every 2-4 weeks" },
      { emoji: "🪥", title: "Dental care", detail: "Routine teeth cleaning — can be prone to early-onset gingivitis.", cadence: "3-7× weekly" },
      { emoji: "⚖️", title: "Weight check", detail: "Critical routine monitoring — maintaining a lean body condition is essential to avoid excess strain on their large joints.", cadence: "Monthly" },
      { emoji: "🛡️", title: "Parasite preventative", detail: "Routine flea, tick, and worm prevention.", cadence: "Monthly" },
      { emoji: "🩺", title: "Vet checkup", detail: "Strong focus on cardiac health (screening for Hypertrophic Cardiomyopathy — HCM) and hip dysplasia screenings.", cadence: "Yearly", action: "vet" },
      { emoji: "💊", title: "Medication tracking", detail: "Log any prescribed medication or joint supplements from the veterinary clinic.", cadence: "Daily or as prescribed" },
    ],
  },
  "Siamese": {
    intro:
      "Vet-built plan for a Siamese. Lean, vocal, and highly active — portion control and heavy enrichment matter more than food volume. See the weight & feeding guide below for age/gender-specific amounts.",
    items: [
      { emoji: "🍖", title: "Feeding", detail: "Daily portion-controlled meals based on age and weight.", cadence: "2× daily", perDay: 2, action: "fed" },
      { emoji: "💧", title: "Fresh water", detail: "Clean water refreshed daily.", cadence: "Daily", perDay: 1, action: "water" },
      { emoji: "🧹", title: "Litter box maintenance", detail: "Daily scooping and a routine full litter change every 2-4 weeks.", cadence: "1× daily", perDay: 1, action: "litter" },
      { emoji: "🧶", title: "Play & mental stimulation", detail: "Extremely high need — interactive toys, puzzles, and dedicated play sessions to satisfy their highly intelligent, vocal nature.", cadence: "2-3× daily, 20-30 min" },
      { emoji: "✂️", title: "Brushing / grooming", detail: "Routine weekly brushing to manage shedding of their short coat.", cadence: "Weekly", action: "groomed" },
      { emoji: "🐾", title: "Nail trimming", detail: "Regular clipping to prevent overgrowth and snagging.", cadence: "Every 2-4 weeks" },
      { emoji: "🪥", title: "Dental care", detail: "Strict routine teeth cleaning and dental treats — genetically predisposed to dental disease.", cadence: "3-7× weekly" },
      { emoji: "⚖️", title: "Weight check", detail: "Routine monitoring to ensure a healthy body condition.", cadence: "Monthly" },
      { emoji: "🛡️", title: "Parasite preventative", detail: "Routine flea, tick, and worm prevention.", cadence: "Monthly" },
      { emoji: "🩺", title: "Vet checkup", detail: "Monitoring for progressive retinal atrophy (PRA) and respiratory health.", cadence: "Yearly", action: "vet" },
      { emoji: "💊", title: "Medication tracking", detail: "Log any prescribed medication from the veterinary clinic.", cadence: "1-3× daily as prescribed" },
    ],
  },
  "Ragdoll": {
    intro:
      "Vet-built plan for a Ragdoll. Large, docile, semi-long-haired breed — grooming and a heart-health baseline are the priorities. See the weight & feeding guide below for age/gender-specific amounts.",
    items: [
      { emoji: "🍖", title: "Feeding", detail: "Daily portion-controlled meals based on age and weight.", cadence: "2× daily", perDay: 2, action: "fed" },
      { emoji: "💧", title: "Fresh water", detail: "Clean water refreshed daily.", cadence: "Daily", perDay: 1, action: "water" },
      { emoji: "🧹", title: "Litter box maintenance", detail: "Daily scooping and a routine full litter change every 2-4 weeks.", cadence: "1× daily", perDay: 1, action: "litter" },
      { emoji: "🧶", title: "Play & mental stimulation", detail: "Moderate interactive play — known for their highly docile, relaxed temperament.", cadence: "1-2× daily, 15 min" },
      { emoji: "✂️", title: "Brushing / grooming", detail: "Frequent brushing (at least twice a week) to maintain their semi-long, plush coat and prevent tangles/mats.", cadence: "2× weekly", action: "groomed" },
      { emoji: "🐾", title: "Nail trimming", detail: "Regular clipping to prevent overgrowth and snagging.", cadence: "Every 2-4 weeks" },
      { emoji: "🪥", title: "Dental care", detail: "Routine teeth cleaning, water additives, or dental treats.", cadence: "3-7× weekly" },
      { emoji: "⚖️", title: "Weight check", detail: "Routine monitoring to ensure a healthy body condition.", cadence: "Monthly" },
      { emoji: "🛡️", title: "Parasite preventative", detail: "Routine flea, tick, and worm prevention.", cadence: "Monthly" },
      { emoji: "🩺", title: "Vet checkup", detail: "Focus on cardiac screening for HCM, a known genetic predisposition in the breed.", cadence: "Yearly", action: "vet" },
      { emoji: "💊", title: "Medication tracking", detail: "Log any prescribed medication from the veterinary clinic.", cadence: "1-3× daily as prescribed" },
    ],
  },
  "Bengal": {
    intro:
      "Vet-built plan for a Bengal. High-energy, athletic breed with wild instincts — enrichment and exercise matter as much as diet. See the weight & feeding guide below for age/gender-specific amounts.",
    items: [
      { emoji: "🍖", title: "Feeding", detail: "Portion-controlled meals — food puzzles or foraging mats are highly recommended to simulate hunting and satisfy their wild instincts.", cadence: "2× daily", perDay: 2, action: "fed" },
      { emoji: "💧", title: "Fresh water", detail: "Clean water refreshed daily — they often love playing in water, so fountains are a great choice.", cadence: "Daily", perDay: 1, action: "water" },
      { emoji: "🧹", title: "Litter box maintenance", detail: "Daily scooping and a routine full litter change every 2-4 weeks.", cadence: "1× daily", perDay: 1, action: "litter" },
      { emoji: "🧶", title: "Play & mental stimulation", detail: "Intense daily physical and mental stimulation. Vertical spaces (tall cat trees), exercise wheels, and highly active play prevent boredom and destructive behaviors.", cadence: "2-3× daily, 30+ min" },
      { emoji: "✂️", title: "Brushing / grooming", detail: "Minimal routine brushing — their unique pelt-like coat is short and requires little maintenance.", cadence: "Weekly", action: "groomed" },
      { emoji: "🐾", title: "Nail trimming", detail: "Regular clipping to prevent overgrowth and snagging.", cadence: "Every 2-4 weeks" },
      { emoji: "🪥", title: "Dental care", detail: "Routine teeth cleaning, water additives, or dental treats.", cadence: "3-7× weekly" },
      { emoji: "⚖️", title: "Weight check", detail: "Routine monitoring to ensure their athletic, muscular build is maintained.", cadence: "Monthly" },
      { emoji: "🛡️", title: "Parasite preventative", detail: "Routine flea, tick, and worm prevention.", cadence: "Monthly" },
      { emoji: "🩺", title: "Vet checkup", detail: "Monitoring for hereditary eye issues (PRA) and joint health.", cadence: "Yearly", action: "vet" },
      { emoji: "💊", title: "Medication tracking", detail: "Log any prescribed medication from the veterinary clinic.", cadence: "1-3× daily as prescribed" },
    ],
  },
  "Scottish Fold": {
    intro:
      "Vet-built plan for a Scottish Fold. Prone to progressive joint/cartilage disease — weight control and mobility monitoring are the priorities. See the weight & feeding guide below for age/gender-specific amounts.",
    items: [
      { emoji: "🍖", title: "Feeding", detail: "Portion-controlled meals placed in easily accessible locations so the cat doesn't have to jump or strain to reach food.", cadence: "2× daily", perDay: 2, action: "fed" },
      { emoji: "💧", title: "Fresh water", detail: "Clean water refreshed daily, kept at ground level.", cadence: "Daily", perDay: 1, action: "water" },
      { emoji: "🧹", title: "Litter box maintenance", detail: "Daily scooping. Use a litter box with a low entry point to accommodate potential joint stiffness.", cadence: "1× daily", perDay: 1, action: "litter" },
      { emoji: "🧶", title: "Play & mental stimulation", detail: "Low-impact interactive play that keeps them moving without excessive jumping stress on their joints.", cadence: "1-2× daily, 10-15 min" },
      { emoji: "✂️", title: "Brushing / grooming", detail: "Gentle routine brushing — be highly sensitive and cautious to avoid causing pain to stiff or arthritic joints.", cadence: "Weekly", action: "groomed" },
      { emoji: "🐾", title: "Nail trimming", detail: "Regular clipping — reduced mobility may prevent them from naturally wearing down claws on scratching posts.", cadence: "Every 2-4 weeks" },
      { emoji: "🪥", title: "Dental care", detail: "Routine teeth cleaning, water additives, or dental treats.", cadence: "3-7× weekly" },
      { emoji: "⚖️", title: "Weight check", detail: "Crucial, strict monitoring — excess weight significantly exacerbates joint pain and arthritis.", cadence: "1-2× monthly" },
      { emoji: "🛡️", title: "Parasite preventative", detail: "Routine flea, tick, and worm prevention.", cadence: "Monthly" },
      { emoji: "🩺", title: "Vet checkup", detail: "Critical monitoring for osteochondrodysplasia (Scottish Fold disease), a genetic condition causing progressive arthritis and joint deformities — this can start as early as a few months old. Between visits, watch for reluctance to jump, a stiff/stilted gait, or a shortened, inflexible tail, and see the vet promptly if these appear.", cadence: "Yearly", action: "vet" },
      { emoji: "💊", title: "Medication tracking", detail: "Log any prescribed medication, particularly joint supplements or pain management meds.", cadence: "1-2× daily or as prescribed" },
    ],
  },
};

export function cosmetic(id: string): Cosmetic | undefined {
  return COSMETICS.find((c) => c.id === id);
}

/** One age-stage/gender row of a breed's vet weight & feeding guide. */
export interface WeightFeedingEntry {
  ageLabel: "3 Months" | "6 Months" | "Adult";
  sex: "male" | "female" | "both";
  weightKgRange: [number, number];
  calorieRange: [number, number];
  kibbleGramsRange: [number, number];
}

/** Age (in years) at which each breed's guide switches from "6 Months" to "Adult" figures. */
export const ADULT_THRESHOLD_YEARS: Record<string, number> = {
  "Stray Cat": 1,
  "Persian": 1,
  "Maine Coon": 3,
  "Siamese": 1,
  "British Shorthair": 3,
  "Ragdoll": 3,
  "Bengal": 1.5,
  "Scottish Fold": 1,
  "Labrador Retriever": 1.5,
  "French Bulldog": 1,
  "German Shepherd": 2,
  "Golden Retriever": 1.5,
  "Poodle": 1.5,
  "Bulldog": 1.5,
  "Beagle": 1,
  "Rottweiler": 2,
};

/** Vet-built weight/calorie/kibble guide per breed, broken out by age stage and gender. */
export const WEIGHT_FEEDING_GUIDES: Record<string, WeightFeedingEntry[]> = {
  "Stray Cat": [
    { ageLabel: "3 Months", sex: "both", weightKgRange: [1.4, 1.8], calorieRange: [200, 250], kibbleGramsRange: [55, 65] },
    { ageLabel: "6 Months", sex: "both", weightKgRange: [2.3, 3.2], calorieRange: [250, 300], kibbleGramsRange: [65, 80] },
    { ageLabel: "Adult", sex: "male", weightKgRange: [4.5, 5.5], calorieRange: [250, 300], kibbleGramsRange: [65, 80] },
    { ageLabel: "Adult", sex: "female", weightKgRange: [3.5, 4.5], calorieRange: [200, 250], kibbleGramsRange: [55, 65] },
  ],
  "Persian": [
    { ageLabel: "3 Months", sex: "both", weightKgRange: [1.4, 1.8], calorieRange: [200, 250], kibbleGramsRange: [55, 65] },
    { ageLabel: "6 Months", sex: "both", weightKgRange: [2.3, 3.2], calorieRange: [250, 300], kibbleGramsRange: [65, 80] },
    { ageLabel: "Adult", sex: "male", weightKgRange: [4, 5.5], calorieRange: [230, 280], kibbleGramsRange: [60, 75] },
    { ageLabel: "Adult", sex: "female", weightKgRange: [3, 4.5], calorieRange: [180, 230], kibbleGramsRange: [45, 60] },
  ],
  "Maine Coon": [
    { ageLabel: "3 Months", sex: "both", weightKgRange: [2, 2.7], calorieRange: [250, 350], kibbleGramsRange: [65, 90] },
    { ageLabel: "6 Months", sex: "both", weightKgRange: [3.6, 4.5], calorieRange: [350, 450], kibbleGramsRange: [90, 120] },
    { ageLabel: "Adult", sex: "male", weightKgRange: [6.8, 11.3], calorieRange: [350, 500], kibbleGramsRange: [90, 130] },
    { ageLabel: "Adult", sex: "female", weightKgRange: [4.5, 6.8], calorieRange: [250, 350], kibbleGramsRange: [65, 90] },
  ],
  "Siamese": [
    { ageLabel: "3 Months", sex: "both", weightKgRange: [1.4, 1.8], calorieRange: [200, 250], kibbleGramsRange: [55, 65] },
    { ageLabel: "6 Months", sex: "both", weightKgRange: [2, 3], calorieRange: [250, 300], kibbleGramsRange: [65, 80] },
    { ageLabel: "Adult", sex: "male", weightKgRange: [4, 5.5], calorieRange: [230, 280], kibbleGramsRange: [60, 75] },
    { ageLabel: "Adult", sex: "female", weightKgRange: [3.6, 4.5], calorieRange: [200, 250], kibbleGramsRange: [55, 65] },
  ],
  "British Shorthair": [
    { ageLabel: "3 Months", sex: "both", weightKgRange: [1.5, 2], calorieRange: [220, 280], kibbleGramsRange: [60, 75] },
    { ageLabel: "6 Months", sex: "both", weightKgRange: [2.5, 3.5], calorieRange: [280, 350], kibbleGramsRange: [75, 90] },
    { ageLabel: "Adult", sex: "male", weightKgRange: [5.5, 8], calorieRange: [300, 400], kibbleGramsRange: [80, 105] },
    { ageLabel: "Adult", sex: "female", weightKgRange: [4, 5.5], calorieRange: [230, 300], kibbleGramsRange: [60, 80] },
  ],
  "Ragdoll": [
    { ageLabel: "3 Months", sex: "both", weightKgRange: [1.8, 2.5], calorieRange: [230, 300], kibbleGramsRange: [60, 80] },
    { ageLabel: "6 Months", sex: "both", weightKgRange: [3.2, 4.5], calorieRange: [330, 400], kibbleGramsRange: [85, 105] },
    { ageLabel: "Adult", sex: "male", weightKgRange: [6.8, 9], calorieRange: [350, 450], kibbleGramsRange: [90, 120] },
    { ageLabel: "Adult", sex: "female", weightKgRange: [4.5, 6.8], calorieRange: [250, 350], kibbleGramsRange: [65, 90] },
  ],
  "Bengal": [
    { ageLabel: "3 Months", sex: "both", weightKgRange: [1.4, 2], calorieRange: [220, 280], kibbleGramsRange: [60, 75] },
    { ageLabel: "6 Months", sex: "both", weightKgRange: [2.5, 3.6], calorieRange: [280, 350], kibbleGramsRange: [75, 90] },
    { ageLabel: "Adult", sex: "male", weightKgRange: [4.5, 6.8], calorieRange: [300, 350], kibbleGramsRange: [80, 90] },
    { ageLabel: "Adult", sex: "female", weightKgRange: [3.6, 4.5], calorieRange: [230, 280], kibbleGramsRange: [60, 75] },
  ],
  "Scottish Fold": [
    { ageLabel: "3 Months", sex: "both", weightKgRange: [1.4, 1.8], calorieRange: [200, 250], kibbleGramsRange: [55, 65] },
    { ageLabel: "6 Months", sex: "both", weightKgRange: [2.3, 3.2], calorieRange: [250, 300], kibbleGramsRange: [65, 80] },
    { ageLabel: "Adult", sex: "male", weightKgRange: [4, 6], calorieRange: [250, 320], kibbleGramsRange: [65, 85] },
    { ageLabel: "Adult", sex: "female", weightKgRange: [2.7, 4], calorieRange: [180, 250], kibbleGramsRange: [45, 65] },
  ],
  "Labrador Retriever": [
    { ageLabel: "3 Months", sex: "both", weightKgRange: [11, 14], calorieRange: [900, 1100], kibbleGramsRange: [235, 290] },
    { ageLabel: "6 Months", sex: "both", weightKgRange: [20, 25], calorieRange: [1200, 1500], kibbleGramsRange: [315, 395] },
    { ageLabel: "Adult", sex: "male", weightKgRange: [29, 36], calorieRange: [1300, 1600], kibbleGramsRange: [340, 420] },
    { ageLabel: "Adult", sex: "female", weightKgRange: [25, 32], calorieRange: [1100, 1400], kibbleGramsRange: [290, 370] },
  ],
  "French Bulldog": [
    { ageLabel: "3 Months", sex: "both", weightKgRange: [3, 5], calorieRange: [350, 450], kibbleGramsRange: [90, 120] },
    { ageLabel: "6 Months", sex: "both", weightKgRange: [7, 9], calorieRange: [500, 600], kibbleGramsRange: [130, 160] },
    { ageLabel: "Adult", sex: "male", weightKgRange: [9, 13], calorieRange: [600, 750], kibbleGramsRange: [160, 200] },
    { ageLabel: "Adult", sex: "female", weightKgRange: [7, 11], calorieRange: [500, 650], kibbleGramsRange: [130, 170] },
  ],
  "German Shepherd": [
    { ageLabel: "3 Months", sex: "both", weightKgRange: [11, 16], calorieRange: [900, 1200], kibbleGramsRange: [235, 315] },
    { ageLabel: "6 Months", sex: "both", weightKgRange: [22, 27], calorieRange: [1300, 1600], kibbleGramsRange: [340, 420] },
    { ageLabel: "Adult", sex: "male", weightKgRange: [30, 40], calorieRange: [1500, 2000], kibbleGramsRange: [395, 525] },
    { ageLabel: "Adult", sex: "female", weightKgRange: [22, 32], calorieRange: [1200, 1600], kibbleGramsRange: [315, 420] },
  ],
  "Golden Retriever": [
    { ageLabel: "3 Months", sex: "both", weightKgRange: [10, 13], calorieRange: [900, 1100], kibbleGramsRange: [235, 290] },
    { ageLabel: "6 Months", sex: "both", weightKgRange: [18, 23], calorieRange: [1200, 1450], kibbleGramsRange: [315, 380] },
    { ageLabel: "Adult", sex: "male", weightKgRange: [29, 34], calorieRange: [1300, 1600], kibbleGramsRange: [340, 420] },
    { ageLabel: "Adult", sex: "female", weightKgRange: [25, 29], calorieRange: [1100, 1350], kibbleGramsRange: [290, 355] },
  ],
  "Poodle": [
    { ageLabel: "3 Months", sex: "both", weightKgRange: [7, 10], calorieRange: [600, 800], kibbleGramsRange: [160, 210] },
    { ageLabel: "6 Months", sex: "both", weightKgRange: [14, 18], calorieRange: [900, 1200], kibbleGramsRange: [235, 315] },
    { ageLabel: "Adult", sex: "male", weightKgRange: [27, 32], calorieRange: [1200, 1400], kibbleGramsRange: [315, 370] },
    { ageLabel: "Adult", sex: "female", weightKgRange: [18, 23], calorieRange: [900, 1100], kibbleGramsRange: [235, 290] },
  ],
  "Bulldog": [
    { ageLabel: "3 Months", sex: "both", weightKgRange: [6, 9], calorieRange: [500, 650], kibbleGramsRange: [130, 170] },
    { ageLabel: "6 Months", sex: "both", weightKgRange: [14, 18], calorieRange: [800, 1000], kibbleGramsRange: [210, 265] },
    { ageLabel: "Adult", sex: "male", weightKgRange: [23, 25], calorieRange: [1100, 1300], kibbleGramsRange: [290, 340] },
    { ageLabel: "Adult", sex: "female", weightKgRange: [18, 23], calorieRange: [900, 1100], kibbleGramsRange: [235, 290] },
  ],
  "Beagle": [
    { ageLabel: "3 Months", sex: "both", weightKgRange: [3.5, 5], calorieRange: [400, 500], kibbleGramsRange: [105, 130] },
    { ageLabel: "6 Months", sex: "both", weightKgRange: [7, 9], calorieRange: [600, 750], kibbleGramsRange: [160, 200] },
    { ageLabel: "Adult", sex: "male", weightKgRange: [10, 14], calorieRange: [700, 900], kibbleGramsRange: [185, 235] },
    { ageLabel: "Adult", sex: "female", weightKgRange: [9, 11], calorieRange: [600, 800], kibbleGramsRange: [160, 210] },
  ],
  "Rottweiler": [
    { ageLabel: "3 Months", sex: "both", weightKgRange: [15, 19], calorieRange: [1100, 1400], kibbleGramsRange: [290, 370] },
    { ageLabel: "6 Months", sex: "both", weightKgRange: [29, 34], calorieRange: [1600, 1900], kibbleGramsRange: [420, 500] },
    { ageLabel: "Adult", sex: "male", weightKgRange: [43, 61], calorieRange: [2100, 2800], kibbleGramsRange: [550, 735] },
    { ageLabel: "Adult", sex: "female", weightKgRange: [36, 45], calorieRange: [1800, 2200], kibbleGramsRange: [475, 580] },
  ],
};

/** Age-stage bucket ("3 Months" / "6 Months" / "Adult") for a pet, per its breed's maturity threshold. */
export function weightFeedingStage(ageYears: number, breed: string): "3 Months" | "6 Months" | "Adult" {
  const adult = ADULT_THRESHOLD_YEARS[breed] ?? 1;
  if (ageYears < 0.5) return "3 Months";
  if (ageYears < adult) return "6 Months";
  return "Adult";
}

/** The matching weight/calorie/kibble row for a pet's current age stage and gender
 *  (falls back to the stage's combined "both" row when sex is unset). */
export function weightFeedingEntry(pet: Pick<Pet, "ageYears" | "breed" | "sex">): WeightFeedingEntry | undefined {
  const stage = weightFeedingStage(pet.ageYears, pet.breed);
  const rows = WEIGHT_FEEDING_GUIDES[pet.breed]?.filter((r) => r.ageLabel === stage);
  if (!rows?.length) return undefined;
  return rows.find((r) => r.sex === pet.sex) ?? rows.find((r) => r.sex === "both") ?? rows[0];
}

/** Healthy weight range (kg) for a pet's current age/gender — used for the weight-chart band. */
export function weightTargetRange(pet: Pick<Pet, "ageYears" | "breed" | "sex">): [number, number] | undefined {
  return weightFeedingEntry(pet)?.weightKgRange;
}

/** Fallback daily targets per species for pets without a breed-specific care plan. */
export const DEFAULT_TARGETS: Record<"cat" | "dog", Partial<Record<ActionType, number>>> = {
  cat: { fed: 3, water: 2, litter: 1 },
  dog: { fed: 2, water: 2, walk: 2 },
};

/** Maps an ActionType to its key on Pet.customPlan, for the ones a custom plan can override. */
const CUSTOM_PLAN_KEYS: Partial<Record<ActionType, Exclude<keyof NonNullable<Pet["customPlan"]>, "cadences">>> = {
  fed: "fedPerDay",
  water: "waterPerDay",
  litter: "litterPerDay",
  walk: "walkPerDay",
};

/** Recommended daily count for an action: the pet's own custom targets first (if set),
 *  then the breed's care plan, then the species fallback. */
export function dailyTarget(pet: Pick<Pet, "species" | "breed" | "customPlan">, type: ActionType): number | undefined {
  const customKey = CUSTOM_PLAN_KEYS[type];
  if (customKey && pet.customPlan?.[customKey] != null) return pet.customPlan[customKey];
  const fromPlan = CARE_PLANS[pet.breed]?.items.find((i) => i.action === type)?.perDay;
  if (fromPlan != null) return fromPlan;
  return DEFAULT_TARGETS[pet.species][type];
}

/** Recommended daily grams of food: the pet's own custom target first (if set), then its
 *  age/gender-specific vet guide, else the pet's own cup size × its fallback meal count. */
export function dailyGramTarget(pet: Pet): number | undefined {
  if (pet.customPlan?.fedGrams != null) return pet.customPlan.fedGrams;
  const guideGrams = weightFeedingEntry(pet)?.kibbleGramsRange;
  if (guideGrams) return Math.round((guideGrams[0] + guideGrams[1]) / 2);
  const fromPlan = CARE_PLANS[pet.breed]?.items.find((i) => i.action === "fed")?.perDayGrams;
  if (fromPlan != null) return fromPlan;
  const meals = dailyTarget(pet, "fed");
  return meals != null ? meals * pet.cupGrams : undefined;
}

/** Pounds per kilogram — shared by every weight display/input conversion. */
export const LB_PER_KG = 2.20462;

/** The unit suffix shown in editor labels, e.g. "Weight (kg)" vs "Weight (lb)". */
export function weightUnitLabel(units: "kg" | "lb"): string {
  return units;
}

/** Convert a stored kg value into the user's display unit (lb rounded to 1 dp). */
export function kgToUnit(kg: number, units: "kg" | "lb"): number {
  return units === "lb" ? Math.round(kg * LB_PER_KG * 10) / 10 : kg;
}

/** Convert a value the user typed in their display unit back into stored kg. */
export function unitToKg(value: number, units: "kg" | "lb"): number {
  return units === "lb" ? value / LB_PER_KG : value;
}

export function formatWeight(kg: number, units: "kg" | "lb"): string {
  if (units === "lb") return `${(kg * LB_PER_KG).toFixed(1)} lb`;
  return `${kg % 1 === 0 ? kg : kg.toFixed(1)} kg`;
}

export function formatAge(ageYears: number): string {
  if (ageYears < 1) {
    const months = Math.round(ageYears * 12);
    return `${months} mo`;
  }
  return `${Math.round(ageYears)} yr${Math.round(ageYears) === 1 ? "" : "s"}`;
}
