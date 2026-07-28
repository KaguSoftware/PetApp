import type { Pet } from "@/lib/data";

/**
 * Breed trivia surfaced on Home ("Did you know?").
 *
 * Deliberately NOT care instructions — CARE_PLANS in lib/data.ts owns anything
 * the family is supposed to *do*. These are the "unlike other breeds, your cat…"
 * lines: what makes this particular animal different from the one next door.
 * Where a fact touches health it stays observational and points at the vet
 * rather than prescribing.
 *
 * `{name}` in a body is replaced with the pet's name at render time (see
 * `renderFactBody`), so a fact can address the specific animal without every
 * string needing to be a function.
 */
export interface BreedFact {
  /** Short headline, 2–5 words — rendered as the card's title. */
  title: string;
  /** One or two sentences. May contain the `{name}` placeholder. */
  body: string;
}

/** Facts keyed by the exact breed strings in BREEDS_BY_SPECIES. */
export const BREED_FACTS: Record<string, BreedFact[]> = {
  // ── Dogs ──────────────────────────────────────────────────────────────────
  "Labrador Retriever": [
    {
      title: "A wetsuit, not a coat",
      body: "Unlike most breeds, {name} comes with webbed toes, an oily water-shedding double coat, and a thick “otter tail” used as a rudder. A Lab is built to swim, not just to enjoy it.",
    },
    {
      title: "Hunger is genetic here",
      body: "Roughly a quarter of Labradors carry a POMC gene deletion that dulls the feeling of being full. {name} isn't being greedy — measured portions simply matter more for this breed.",
    },
    {
      title: "A mouth soft enough for eggs",
      body: "Bred to carry shot game back undamaged, retrievers have a famously soft mouth. Many can hold a raw egg without cracking it.",
    },
    {
      title: "31 years at number one",
      body: "The Labrador was America's most registered breed every year from 1991 to 2021 — the longest run any breed has managed, finally ended by the French Bulldog.",
    },
  ],
  "French Bulldog": [
    {
      title: "Bat ears are the whole point",
      body: "Early Frenchies had folded rose ears like English Bulldogs. American fanciers in the 1890s insisted on the upright “bat ear”, and that one preference defined the breed {name} belongs to.",
    },
    {
      title: "Most genuinely can't swim",
      body: "Unlike most dogs, a Frenchie's heavy chest, dense bones, and short muzzle make swimming close to impossible. Around water {name} needs a life vest, not a chance to learn.",
    },
    {
      title: "Usually born by C-section",
      body: "Narrow hips and broad heads mean most Frenchie litters are delivered surgically — one of the reasons the breed is so expensive to produce.",
    },
    {
      title: "Heat, not distance, is the risk",
      body: "Panting is a dog's only real cooling system, and a flat face makes it inefficient. Two short walks in the cool hours beat one long one for {name}.",
    },
  ],
  "German Shepherd": [
    {
      title: "Every Shepherd traces to one dog",
      body: "Max von Stephanitz founded the breed in 1899 around a single dog, Horand von Grafrath. {name}'s pedigree runs back to him.",
    },
    {
      title: "The flying trot",
      body: "Unlike most breeds, the Shepherd was built around a specific gait — a far-reaching trot that let it patrol the edges of a flock all day without tiring.",
    },
    {
      title: "Ears come up late",
      body: "Puppy ears usually stand somewhere between four and six months, often one at a time, and it's normal for them to flop again during teething.",
    },
    {
      title: "Still the working nose",
      body: "Around 225 million scent receptors, plus the biddability to report what they find, keeps the breed first pick for police and search-and-rescue work.",
    },
  ],
  "Golden Retriever": [
    {
      title: "Scottish, not English",
      body: "Developed at Guisachan in the Scottish Highlands from the 1860s, crossing a yellow retriever with the now-extinct Tweed Water Spaniel.",
    },
    {
      title: "Feathering is insulation",
      body: "The long fringe on {name}'s legs, chest, and tail isn't decoration — it's the water-shedding part of a working retriever's coat.",
    },
    {
      title: "A puppy until three",
      body: "Goldens finish growing at about two but stay mentally puppyish until roughly three — noticeably longer than most breeds their size.",
    },
    {
      title: "Worth a monthly lump check",
      body: "The breed has unusually high rates of lymphoma and hemangiosarcoma. Running your hands over jaw, armpits, groin, and behind the knees once a month is how these get caught early.",
    },
  ],
  "Poodle": [
    {
      title: "The haircut had a job",
      body: "The show clip is a working pattern: pom-poms kept joints and chest warm while the rest was shaved for speed in cold water. The name comes from the German “pudeln” — to splash.",
    },
    {
      title: "Hair, not fur",
      body: "Unlike most breeds, {name}'s coat grows continuously and sheds very little, which is why it needs cutting every four to six weeks rather than brushing out.",
    },
    {
      title: "Three sizes, one breed",
      body: "Standard, Miniature, and Toy are judged as varieties of the same breed, not as separate dogs.",
    },
    {
      title: "Second-smartest, by the book",
      body: "In Stanley Coren's working-and-obedience ranking of breeds, the Poodle sits second — behind only the Border Collie.",
    },
  ],
  "Bulldog": [
    {
      title: "A breed rebuilt from scratch",
      body: "Bull-baiting was banned in 1835 and the original athletic bulldog nearly disappeared. Fanciers rebuilt it for temperament, so {name}'s modern shape is only about 150 years old.",
    },
    {
      title: "Water is genuinely dangerous",
      body: "A top-heavy build plus a short muzzle means most Bulldogs sink rather than swim. {name} should never be left unattended near a pool.",
    },
    {
      title: "The folds are a daily job",
      body: "Wrinkles and the tail pocket trap moisture and yeast. Wiping them is only half of it — drying them is what actually prevents infection.",
    },
    {
      title: "Snoring is anatomy",
      body: "An elongated soft palate makes loud sleep normal for the breed. What isn't normal: snoring that suddenly worsens, blue-tinged gums, or panting that won't settle.",
    },
  ],
  "Beagle": [
    {
      title: "220 million scent receptors",
      body: "Roughly forty times what you have. It's why airport “Beagle Brigade” teams work luggage — small enough to be unobtrusive, friendly enough to work around travelers.",
    },
    {
      title: "Three separate voices",
      body: "Unlike most breeds, Beagles have a bark, a yodel-like bay that announces a scent line, and a howl — all bred to carry across open country.",
    },
    {
      title: "The white tail tip is deliberate",
      body: "Breeders fixed the white “flag” at the tail tip so that hunters could still spot {name} working through tall grass.",
    },
    {
      title: "Scent beats recall",
      body: "Once a line is picked up, the nose overrides training. Fences and leashes aren't a training failure for this breed — they're the breed working as designed.",
    },
  ],
  "Rottweiler": [
    {
      title: "A Roman cattle dog",
      body: "Descended from drover dogs that walked herds over the Alps with Roman legions. The name comes from Rottweil, Germany, where butchers reportedly tied their money purses to these dogs' collars.",
    },
    {
      title: "The Rottweiler lean",
      body: "Leaning full body weight against a favourite person is a breed-typical habit. {name} isn't pushing you out of the way — that's the hug.",
    },
    {
      title: "Grows slower than it looks",
      body: "Growth plates don't close until around 18 months. Forced running and repetitive jumping before then is what shows up as joint trouble years later.",
    },
    {
      title: "Ask for a heart listen",
      body: "Aortic stenosis is over-represented in the breed, so it's worth specifically asking for a cardiac auscultation at {name}'s annual exam.",
    },
  ],

  // ── Cats ──────────────────────────────────────────────────────────────────
  "Stray Cat": [
    {
      title: "Mixed ancestry is protection",
      body: "Unlike pedigreed cats drawn from small gene pools, a rescue like {name} carries far less inherited disease risk. The healthiest cat in the room is often the one nobody planned.",
    },
    {
      title: "Ginger cats are usually male",
      body: "The gene for orange fur sits on the X chromosome, so roughly four out of five ginger cats are toms.",
    },
    {
      title: "The slow blink is real",
      body: "A University of Sussex study found cats are measurably more likely to slow-blink back at a person who slow-blinks first — the fastest way to earn a wary cat's trust.",
    },
    {
      title: "A flat-tipped ear is a record",
      body: "A neatly notched or flattened ear tip is the universal mark that a cat was trapped, neutered, and returned — proof the cat has already been fixed.",
    },
  ],
  "Persian": [
    {
      title: "The flat face is recent",
      body: "Traditional “doll-face” Persians had normal muzzles. The extreme flat look traces to a spontaneous mutation in a 1950s litter that breeders then selected for.",
    },
    {
      title: "Tear stains are plumbing",
      body: "Shallow eye sockets and shortened tear ducts mean tears run down the face instead of draining away. Wiping {name}'s eyes daily is maintenance, not grooming vanity.",
    },
    {
      title: "A coat that can't self-maintain",
      body: "At up to five inches long, the Persian coat mats within days. Unlike a short-haired cat, {name} physically cannot keep on top of it alone.",
    },
    {
      title: "One of the oldest fancy breeds",
      body: "Longhaired cats from Persia were documented in Europe as early as the 1600s, and Persians were among the headline breeds at the first modern cat show in 1871.",
    },
  ],
  "Maine Coon": [
    {
      title: "Still growing at four",
      body: "Most cats reach full size at about a year. A Maine Coon keeps filling out until three or four — so {name} may well not be finished yet.",
    },
    {
      title: "Built for snow",
      body: "Tufted paws work like snowshoes, the ear furnishings keep snow out, and that enormous tail gets wrapped around the body as a blanket.",
    },
    {
      title: "Chirps instead of meows",
      body: "The breed is known for trills and chirps rather than a standard meow — a whole conversational vocabulary most cats don't use.",
    },
    {
      title: "Unusually into water",
      body: "A semi-water-resistant coat means Maine Coons often paw at, drink from, and climb into running water rather than avoiding it the way most cats do.",
    },
    {
      title: "Ask about a heart scan",
      body: "The breed carries a known MYBPC3 mutation linked to hypertrophic cardiomyopathy, which is why screening echocardiograms are standard advice for Maine Coons.",
    },
  ],
  "Siamese": [
    {
      title: "Painted by temperature",
      body: "The colorpoint gene is heat-sensitive: pigment only develops where the body runs cooler. {name}'s dark ears, mask, paws, and tail are literally the cold spots.",
    },
    {
      title: "Born completely white",
      body: "The womb is uniformly warm, so points only appear over the first weeks — and a Siamese living somewhere cold keeps darkening with age.",
    },
    {
      title: "Blue eyes come with it",
      body: "The same gene that creates the points also leaves the eyes blue. A true Siamese never has green or gold eyes.",
    },
    {
      title: "The loudest housemate",
      body: "Unlike most cats, Siamese are relentlessly vocal, with a low yowl owners call the “meezer”. It's conversation, not complaint.",
    },
  ],
  "British Shorthair": [
    {
      title: "The original show cat",
      body: "The breed is essentially the standardized British street cat — the type that headlined the very first modern cat show at Crystal Palace in 1871.",
    },
    {
      title: "Affectionate, but hands off",
      body: "Unlike most lap breeds, a Brit wants to be near you rather than on you. {name} may follow you room to room and still object to being picked up.",
    },
    {
      title: "A coat that stands up",
      body: "The dense double coat sits away from the body instead of lying flat, so it needs combing through rather than surface brushing — especially in spring.",
    },
    {
      title: "Slow to mature, quick to gain",
      body: "Full size takes three to five years, and a naturally laid-back cat with a serious appetite gains weight easily. Measured meals do more here than exercise.",
    },
  ],
  "Ragdoll": [
    {
      title: "The name is literal",
      body: "Many Ragdolls go completely limp when picked up — the trait Ann Baker deliberately selected for when she founded the breed in 1960s California.",
    },
    {
      title: "Born white",
      body: "Like the Siamese, Ragdoll kittens arrive pure white and develop their points over the following weeks, with the full colour not settling until around two.",
    },
    {
      title: "An indoor-only breed",
      body: "Trusting to a fault, with little natural wariness of strangers, dogs, or traffic. The docility that makes {name} lovely is exactly why outdoors is dangerous.",
    },
    {
      title: "Big, and in no hurry",
      body: "Males commonly reach 7–9 kg, and the breed isn't fully grown until about four years old.",
    },
  ],
  "Bengal": [
    {
      title: "Genuinely part wild",
      body: "The breed comes from crossing domestic cats with the Asian leopard cat. Only cats four or more generations removed from that wild ancestor count as domestic Bengals.",
    },
    {
      title: "Fur that catches light",
      body: "Many Bengals carry a “glitter” gene — translucent hair shafts that make the coat visibly sparkle in sunlight. It's essentially unique to the breed.",
    },
    {
      title: "Taps, tubs, and toilets",
      body: "Unlike most cats, {name} will actively seek out running water to play in, and some Bengals work out how to open a faucet themselves.",
    },
    {
      title: "Needs a job, not just toys",
      body: "A bored Bengal redecorates. Vertical space, puzzle feeders, and real play sessions are the difference between clever and destructive.",
    },
  ],
  "Scottish Fold": [
    {
      title: "All of them descend from Susie",
      body: "A single white barn cat with folded ears, found on a Perthshire farm in 1961, is the ancestor of every Scottish Fold alive — {name} included.",
    },
    {
      title: "The ears are a cartilage mutation",
      body: "The gene that folds the ear affects cartilage throughout the body, so every Fold carries some degree of joint disease. Several countries restrict or ban breeding them for that reason.",
    },
    {
      title: "Born with straight ears",
      body: "Fold kittens look ordinary for about three weeks. Then some ears fold, and some never do.",
    },
    {
      title: "Watch the jump, not the ears",
      body: "Stiffness, a short inflexible tail, or new reluctance to jump onto a usual perch are the early signs of osteochondrodysplasia, and worth a vet visit.",
    },
  ],
};

/** Fallbacks for pets whose breed isn't in the picklist (including "Other"). */
export const SPECIES_FACTS: Record<"cat" | "dog", BreedFact[]> = {
  cat: [
    {
      title: "Purring is a low hum",
      body: "Cats purr somewhere between 25 and 150 Hz, and it isn't only contentment — cats also purr when injured, anxious, or asking for something.",
    },
    {
      title: "Whiskers measure the world",
      body: "Whiskers sit in nerve-rich follicles that read air currents and gaps. A bowl narrow enough to press them is a genuine reason {name} might leave food behind.",
    },
    {
      title: "No taste for sweetness",
      body: "Cats are the only mammals known to lack a working sweet-taste receptor. As obligate carnivores they have no use for one.",
    },
    {
      title: "Sixteen hours asleep",
      body: "A healthy adult cat sleeps 12–16 hours a day. A sustained change in that — in either direction — is one of the earliest signs something is off.",
    },
    {
      title: "Kneading is kittenhood",
      body: "The paw-treading {name} does on a blanket or your lap is the same motion kittens use to stimulate milk flow while nursing.",
    },
    {
      title: "Silent by design",
      body: "Cats walk directly on their toes with claws retracted clear of the ground — a stalking build most other predators simply don't have.",
    },
  ],
  dog: [
    {
      title: "A nose print is a fingerprint",
      body: "The ridge pattern on a dog's nose is unique to the individual, and some registries have used nose prints as identification.",
    },
    {
      title: "Smell in another league",
      body: "Dogs have up to 300 million olfactory receptors against your 6 million, and proportionally the brain region that processes them is around 40 times larger.",
    },
    {
      title: "Tail wags have a direction",
      body: "Researchers in Trieste found dogs wag further to the right when they see something positive and to the left when something worries them — and other dogs read it.",
    },
    {
      title: "Sweating only through paws",
      body: "Panting is the main cooling system; the only sweat glands are in the paw pads. It's why heat builds so dangerously fast in a parked car.",
    },
    {
      title: "Born deaf and blind",
      body: "Puppies open their eyes at around two weeks and don't hear until about three. Those first weeks run entirely on smell and touch.",
    },
    {
      title: "A fraction of your taste buds",
      body: "About 1,700 against your 9,000 — part of why smell, not flavour, decides what {name} is willing to eat.",
    },
  ],
};

/** A fact plus where it came from, so the card can label its own scope. */
export interface ResolvedFact extends BreedFact {
  /** "breed" = specific to this pet's breed; "species" = true of cats/dogs generally. */
  scope: "breed" | "species";
  /** Ready-to-render attribution line ("Maine Coon" / "Cats in general"). */
  source: string;
}

/**
 * Everything we can say about this pet: its breed's own facts first, then the
 * species-wide ones. A pet whose breed is "Other" (or typed free-hand) still
 * gets a full deck rather than an empty card.
 */
export function factsForPet(pet: Pick<Pet, "breed" | "species">): ResolvedFact[] {
  const breedFacts = BREED_FACTS[pet.breed] ?? [];
  const speciesLabel = pet.species === "cat" ? "Cats in general" : "Dogs in general";
  return [
    ...breedFacts.map((f): ResolvedFact => ({ ...f, scope: "breed", source: pet.breed })),
    ...SPECIES_FACTS[pet.species].map((f): ResolvedFact => ({ ...f, scope: "species", source: speciesLabel })),
  ];
}

/** Substitutes the pet's name into a fact body. */
export function renderFactBody(body: string, name: string): string {
  return body.replace(/\{name\}/g, name);
}

/**
 * Which fact a pet opens on today. Rotating by day (offset per pet, so two pets
 * in one household don't show the same slot) means Home has something new on it
 * each morning without anyone tapping.
 */
export function dailyFactOffset(petId: string, total: number): number {
  if (total <= 0) return 0;
  const day = Math.floor(Date.now() / 86_400_000);
  let hash = 0;
  for (let i = 0; i < petId.length; i++) hash = (hash * 31 + petId.charCodeAt(i)) % 100_000;
  return (day + hash) % total;
}
