import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Defs, Line, RadialGradient, Rect, Stop } from "react-native-svg";
import EditStatSheet from "@/components/EditStatSheet";
import HeaderActions from "@/components/HeaderActions";
import PageLoading from "@/components/PageLoading";
import PetAvatar from "@/components/PetAvatar";
import { PixelCosmetic } from "@/components/pixel/PixelPet";
import Pet3D from "@/components/pixel/Pet3D";
import { COIN_SPRITE } from "@/components/pixel/hudSprites";
import PixelSprite from "@/components/pixel/PixelSprite";
import { TabScreen } from "@/components/Screen";
import Sheet from "@/components/Sheet";
import { Icon } from "@/components/Icons";
import {
  AccentButton,
  Chevron,
  Chip,
  CoinPill,
  FieldLabel,
  Group,
  IconCircle,
  PRESS_SCALE_SMALL,
  PressableScale,
  Row,
  SectionHeader,
  Segmented,
  SheetFooter,
  SheetSubtitle,
  SheetTitle,
  TextField,
} from "@/components/ui";
import {
  BREEDS_BY_SPECIES,
  COSMETICS,
  cosmetic,
  formatAge,
  formatWeight,
  kgToUnit,
  unitToKg,
  weightUnitLabel,
  type Cosmetic,
  type CosmeticSlot,
  type Pet,
} from "@/lib/data";
import { useStore } from "@/lib/store";
import { cardShadow, colors, font, HIT, radius, withAlpha } from "@/lib/theme";

/** TextField forwards every prop to TextInput; React 19 delivers `ref` as a
 *  regular prop, so this alias just teaches the types about it. */

/* One main slot gets a floating + button on the avatar's head; the rest live in "Other accessories" */
const MAIN_SLOTS: { slot: CosmeticSlot; label: string; hint: string }[] = [{ slot: "head", label: "Hat", hint: "Hats & headwear" }];

const OTHER_SLOTS: { slot: CosmeticSlot; hint: string }[] = [
  { slot: "face", hint: "Glasses & eyewear" },
  { slot: "neck", hint: "Collars & scarves" },
  { slot: "body", hint: "Outfits & capes" },
];

/* Sensible starting weight (kg) / cup size (g) per species for the prefilled inputs. */
const SPECIES_DEFAULTS: Record<"cat" | "dog", { weightKg: number; cupGrams: number }> = {
  cat: { weightKg: 4, cupGrams: 60 },
  dog: { weightKg: 20, cupGrams: 120 },
};

const GRID_STEP = 14;

/** Arcade backdrop: soft radial glow near the top + faint 14px retro grid. */
function ArcadeStage({ children, style }: { children: React.ReactNode; style?: object }) {
  const [dim, setDim] = useState({ w: 0, h: 0 });
  const vLines = dim.w > 0 ? Array.from({ length: Math.floor(dim.w / GRID_STEP) }, (_, i) => (i + 1) * GRID_STEP) : [];
  const hLines = dim.h > 0 ? Array.from({ length: Math.floor(dim.h / GRID_STEP) }, (_, i) => (i + 1) * GRID_STEP) : [];
  return (
    <View style={style} onLayout={(e) => setDim({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {dim.w > 0 && dim.h > 0 ? (
        <Svg width={dim.w} height={dim.h} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <RadialGradient id="stageGlow" cx="50%" cy="15%" rx="60%" ry="55%">
              <Stop offset="0" stopColor={colors.arcadeGlow} />
              <Stop offset="1" stopColor={colors.arcadeGlow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          {vLines.map((x) => (
            <Line key={`v${x}`} x1={x} y1={0} x2={x} y2={dim.h} stroke={colors.arcadeGrid} strokeWidth={1} />
          ))}
          {hLines.map((y) => (
            <Line key={`h${y}`} x1={0} y1={y} x2={dim.w} y2={y} stroke={colors.arcadeGrid} strokeWidth={1} />
          ))}
          <Rect x={0} y={0} width={dim.w} height={dim.h} fill="url(#stageGlow)" />
        </Svg>
      ) : null}
      {children}
    </View>
  );
}

function ItemCard({
  c,
  pet,
  coins,
  onBuy,
  onToggle,
}: {
  c: Cosmetic;
  pet: Pet;
  coins: number;
  onBuy: () => void;
  onToggle: () => void;
}) {
  const owned = pet.owned.includes(c.id);
  const equipped = pet.equipped[c.slot] === c.id;
  const affordable = coins >= c.price;
  return (
    <View style={styles.itemCard}>
      <View style={styles.itemPreview}>
        <PixelCosmetic id={c.id} size={44} />
      </View>
      <Text numberOfLines={1} style={styles.itemName}>
        {c.name}
      </Text>
      {owned ? (
        <PressableScale
          scaleTo={PRESS_SCALE_SMALL}
          onPress={onToggle}
          hitSlop={5}
          accessibilityRole="button"
          accessibilityState={{ selected: equipped }}
          style={{ marginTop: 10 }}
        >
          <View style={[styles.itemButton, { backgroundColor: equipped ? colors.greenSoft : colors.fill }]}>
            {equipped ? <Icon name="check" size={14} color={colors.green} /> : null}
            <Text style={[styles.itemButtonLabel, { color: equipped ? colors.green : colors.label }]}>
              {equipped ? "Wearing" : "Put on"}
            </Text>
          </View>
        </PressableScale>
      ) : (
        <PressableScale
          scaleTo={PRESS_SCALE_SMALL}
          disabled={!affordable}
          onPress={onBuy}
          hitSlop={5}
          accessibilityRole="button"
          accessibilityState={{ disabled: !affordable }}
          style={{ marginTop: 10 }}
        >
          <View style={[styles.itemButton, { backgroundColor: affordable ? colors.accentSoft : colors.fill }]}>
            <PixelSprite sprite={COIN_SPRITE} size={13} />
            <Text style={[styles.itemButtonLabel, { color: affordable ? colors.accent : colors.label3 }]}>{c.price}</Text>
          </View>
        </PressableScale>
      )}
    </View>
  );
}

export default function PetsScreen() {
  const { state, hydrated, buyCosmetic, toggleEquip, addPet, addWeight, editPet, toast } = useStore();
  const searchParams = useLocalSearchParams<{ shop?: string }>();
  const [petId, setPetId] = useState(state.pets[0]?.id ?? "");
  const [openSheet, setOpenSheet] = useState<CosmeticSlot | "other" | null>(() => (searchParams.shop === "1" ? "other" : null));
  const [addPetOpen, setAddPetOpen] = useState(false);
  const [petName, setPetName] = useState("");
  const [species, setSpecies] = useState<"cat" | "dog">("cat");
  const [breed, setBreed] = useState("");
  const [breedFocus, setBreedFocus] = useState(false);
  const [sex, setSex] = useState<"female" | "male">("female");
  const [ageInput, setAgeInput] = useState("1");
  const [weightInput, setWeightInput] = useState("");
  const [cupInput, setCupInput] = useState("");
  const [editingStat, setEditingStat] = useState<"weight" | "age" | null>(null);
  const [petPickerOpen, setPetPickerOpen] = useState(false);
  const breedRef = useRef<TextInput>(null);

  // "Coin bump" pop on the stage pet whenever a buy/equip lands.
  const bump = useSharedValue(1);
  const bumpStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.value }] }));
  const react = () => {
    bump.value = withSequence(
      withTiming(1.18, { duration: 160, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) })
    );
  };

  const pet = state.pets.find((p) => p.id === petId) ?? state.pets[0];
  const mainMeta = MAIN_SLOTS.find((s) => s.slot === openSheet);

  if (!hydrated)
    return (
      <TabScreen title="Pets" subtitle="Style your companion" trailing={<HeaderActions />}>
        <PageLoading />
      </TabScreen>
    );

  // Prefill the weight/cup inputs from the species defaults (weight shown in
  // the household's unit) so the sheet opens with reasonable numbers to tweak.
  const prefillFor = (sp: "cat" | "dog") => {
    const d = SPECIES_DEFAULTS[sp];
    setWeightInput(String(Math.round(kgToUnit(d.weightKg, state.units) * 10) / 10));
    setCupInput(String(d.cupGrams));
  };
  const openAddPet = () => {
    setSpecies("cat");
    setBreed("");
    setBreedFocus(false);
    setSex("female");
    setAgeInput("1");
    prefillFor("cat");
    setPetName("");
    setAddPetOpen(true);
  };
  const resetAddPetForm = () => {
    setPetName("");
  };

  // Resolve the typed breed against the known list case-insensitively, so a
  // match (however the user capitalised it) is saved under its canonical name
  // and picks up the vet-built CARE_PLANS entry; anything else is a custom breed.
  const breedQuery = breed.trim().toLowerCase();
  const canonicalBreed = BREEDS_BY_SPECIES[species].find((b) => b.toLowerCase() === breedQuery);
  const breedSuggestions = breedQuery
    ? BREEDS_BY_SPECIES[species].filter((b) => b.toLowerCase().includes(breedQuery) && b.toLowerCase() !== breedQuery)
    : [];
  const resolvedBreed = canonicalBreed ?? (breed.trim() || (species === "cat" ? "House cat" : "Mixed breed"));
  const parsedAge = Number(ageInput);
  const parsedWeightUnit = Number(weightInput);
  const parsedCup = Number(cupInput);
  const addPetValid =
    petName.trim().length > 0 &&
    Number.isFinite(parsedAge) &&
    parsedAge >= 0 &&
    Number.isFinite(parsedWeightUnit) &&
    parsedWeightUnit > 0 &&
    Number.isFinite(parsedCup) &&
    parsedCup > 0;

  const addPetSheet = (
    <Sheet
      open={addPetOpen}
      onClose={() => {
        setAddPetOpen(false);
        resetAddPetForm();
      }}
    >
      <SheetTitle>Add a pet</SheetTitle>

      <FieldLabel>Name</FieldLabel>
      <TextField
        value={petName}
        onChangeText={setPetName}
        placeholder="e.g. Mochi"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => breedRef.current?.focus()}
      />

      <FieldLabel>Species</FieldLabel>
      <Segmented
        options={[
          { value: "cat", label: "Cat" },
          { value: "dog", label: "Dog" },
        ]}
        value={species}
        onChange={(s) => {
          setSpecies(s);
          setBreed("");
          setBreedFocus(false);
          prefillFor(s);
        }}
      />

      <FieldLabel>Breed</FieldLabel>
      <TextField
        ref={breedRef}
        value={breed}
        onChangeText={setBreed}
        onFocus={() => setBreedFocus(true)}
        onBlur={() => setBreedFocus(false)}
        placeholder="Start typing a breed…"
        autoComplete="off"
        autoCorrect={false}
        returnKeyType="done"
      />
      {breedFocus && breedSuggestions.length > 0 ? (
        <View style={styles.suggestions}>
          {breedSuggestions.slice(0, 6).map((b) => (
            <Pressable
              key={b}
              onPress={() => {
                setBreed(b);
                setBreedFocus(false);
              }}
              style={({ pressed }) => [styles.suggestionRow, pressed && { backgroundColor: colors.fill }]}
            >
              <Text style={styles.suggestionLabel}>{b}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {breed.trim().length > 0 ? (
        <Text style={styles.breedHint}>
          {canonicalBreed
            ? "This breed has a vet-built care plan."
            : "Not on the list — you'll set custom feeding/water/care targets on the Care tab."}
        </Text>
      ) : null}

      <FieldLabel>Sex</FieldLabel>
      <Segmented
        options={[
          { value: "female", label: "Female" },
          { value: "male", label: "Male" },
        ]}
        value={sex}
        onChange={setSex}
      />

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <FieldLabel>Age (years)</FieldLabel>
          <TextField value={ageInput} onChangeText={setAgeInput} keyboardType="decimal-pad" returnKeyType="done" placeholder="1" />
        </View>
        <View style={{ flex: 1 }}>
          <FieldLabel>{`Weight (${weightUnitLabel(state.units)})`}</FieldLabel>
          <TextField value={weightInput} onChangeText={setWeightInput} keyboardType="decimal-pad" returnKeyType="done" placeholder="0" />
        </View>
      </View>

      <FieldLabel>Cup size (grams of food per cup)</FieldLabel>
      <TextField value={cupInput} onChangeText={setCupInput} keyboardType="number-pad" returnKeyType="done" placeholder="60" />

      <SheetFooter>
        <AccentButton
          disabled={!addPetValid}
          onPress={() => {
            addPet({
              name: petName.trim(),
              species,
              breed: resolvedBreed,
              sex,
              ageYears: parsedAge,
              weightKg: unitToKg(parsedWeightUnit, state.units),
              cupGrams: Math.round(parsedCup),
            });
            setAddPetOpen(false);
            resetAddPetForm();
          }}
        >
          Add to family
        </AccentButton>
      </SheetFooter>
    </Sheet>
  );

  if (!pet) {
    return (
      <TabScreen title="Pets" subtitle="Style your companion" trailing={<HeaderActions />}>
        <View style={{ marginTop: 16 }}>
          <AccentButton onPress={openAddPet}>Add a pet</AccentButton>
        </View>
        {addPetSheet}
      </TabScreen>
    );
  }

  const buy = (c: Cosmetic) => {
    buyCosmetic(pet.id, c.id);
    react();
    toast("bag", `${c.name} purchased`, `${pet.name} is wearing it now`);
  };
  const toggle = (c: Cosmetic) => {
    const wasEquipped = pet.equipped[c.slot] === c.id;
    toggleEquip(pet.id, c.id);
    react();
    if (wasEquipped) toast("paw", `Took off the ${c.name}`, `${pet.name}'s look updated`);
    else toast("paw", `${pet.name} is wearing the ${c.name}`, "Looking sharp");
  };

  return (
    <TabScreen
      title="Pets"
      subtitle="Style your companion"
      trailing={<HeaderActions />}
    >
      {state.pets.length > 1 ? (
        <PressableScale onPress={() => setPetPickerOpen(true)} accessibilityRole="button" style={{ marginBottom: 8 }}>
          <View style={styles.petSwitcher}>
            <Text style={styles.petSwitcherName}>{pet.name}</Text>
            <Chevron />
          </View>
        </PressableScale>
      ) : null}

      <Sheet open={petPickerOpen} onClose={() => setPetPickerOpen(false)}>
        <View style={{ marginBottom: 12 }}>
          <SheetTitle>Switch pet</SheetTitle>
        </View>
        <Group>
          {state.pets.map((p) => (
            <Row
              key={p.id}
              onPress={() => {
                setPetId(p.id);
                setPetPickerOpen(false);
              }}
              leading={<PetAvatar pet={p} size="sm" />}
              title={p.name}
              subtitle={p.breed}
              trailing={p.id === pet.id ? <Icon name="check" size={18} color={colors.accent} /> : undefined}
            />
          ))}
          <Row
            onPress={() => {
              setPetPickerOpen(false);
              openAddPet();
            }}
            leading={<IconCircle icon="plus" tint={colors.accent} bg={colors.accentSoft} />}
            title="Add a pet"
          />
        </Group>
      </Sheet>

      {/* Dressing stage — always the real voxel 3D pet (no 2D/3D toggle). */}
      <View style={styles.stageCard}>
        <ArcadeStage style={styles.stage}>
          <View style={styles.petBox}>
            <Animated.View style={[styles.petCenter, bumpStyle]}>
              <Pet3D pet={pet} size={200} />
            </Animated.View>

            {/* Head slot button — shows the pixel hat when equipped. Kept
                visible in 3D too so hat editing stays reachable; tucked into
                the top-left corner there, mirroring the 3D toggle on the right. */}
            {MAIN_SLOTS.map((s) => {
              const equippedId = pet.equipped[s.slot];
              return (
                <PressableScale
                  key={s.slot}
                  scaleTo={PRESS_SCALE_SMALL}
                  onPress={() => setOpenSheet(s.slot)}
                  accessibilityRole="button"
                  accessibilityLabel={`${s.label}: ${equippedId ? cosmetic(equippedId)?.name : "empty — tap to add"}`}
                  style={[styles.slotButtonWrap, { left: -8, top: -8 }]}
                >
                  <View style={styles.slotButton}>
                    {equippedId ? <PixelCosmetic id={equippedId} size={24} /> : <Icon name="plus" size={19} color={colors.label2} />}
                  </View>
                </PressableScale>
              );
            })}
          </View>

          <Text style={styles.dragHint}>Drag to spin</Text>

          <Text style={styles.petName}>{pet.name}</Text>
          <Text style={styles.petBreed}>{pet.breed}</Text>
          <View style={styles.chipsRow}>
            <PressableScale
              scaleTo={PRESS_SCALE_SMALL}
              onPress={() => setEditingStat("age")}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Age ${formatAge(pet.ageYears)} — tap to edit`}
            >
              <Chip>{formatAge(pet.ageYears)}</Chip>
            </PressableScale>
            <PressableScale
              scaleTo={PRESS_SCALE_SMALL}
              onPress={() => setEditingStat("weight")}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Weight ${formatWeight(pet.weightKg, state.units)} — tap to edit`}
            >
              <Chip>{formatWeight(pet.weightKg, state.units)}</Chip>
            </PressableScale>
            <Chip>{pet.owned.length} items</Chip>
          </View>

          {/* Other accessories */}
          <PressableScale onPress={() => setOpenSheet("other")} accessibilityRole="button" style={{ marginTop: 20, width: "100%" }}>
            <View style={styles.otherButton}>
              <Icon name="bag" size={17} color={colors.label} />
              <Text style={styles.otherButtonLabel}>Other accessories</Text>
            </View>
          </PressableScale>
        </ArcadeStage>
      </View>

      {/* Add-pet affordance lives in content (header stays CoinPill + bell) */}
      <Group style={{ marginTop: 16 }}>
        <Row
          onPress={openAddPet}
          leading={<IconCircle icon="plus" tint={colors.accent} bg={colors.accentSoft} />}
          title="Add another pet"
          subtitle="Cats & dogs welcome"
          trailing={<Chevron />}
        />
      </Group>

      {/* Picker sheet */}
      <Sheet open={openSheet !== null} onClose={() => setOpenSheet(null)}>
        {openSheet === "other" ? (
          <>
            <View style={styles.sheetTitleRow}>
              <SheetTitle>Other accessories</SheetTitle>
              <CoinPill amount={state.coins} />
            </View>
            <SheetSubtitle>For {pet.name}</SheetSubtitle>
            {OTHER_SLOTS.map((s) => (
              <View key={s.slot}>
                <SectionHeader>{s.hint}</SectionHeader>
                <View style={styles.shopGrid}>
                  {COSMETICS.filter((c) => c.slot === s.slot).map((c) => (
                    <ItemCard key={c.id} c={c} pet={pet} coins={state.coins} onBuy={() => buy(c)} onToggle={() => toggle(c)} />
                  ))}
                </View>
              </View>
            ))}
          </>
        ) : openSheet && mainMeta ? (
          <>
            <View style={styles.sheetTitleRow}>
              <SheetTitle>{mainMeta.hint}</SheetTitle>
              <CoinPill amount={state.coins} />
            </View>
            <SheetSubtitle>
              For {pet.name} · {mainMeta.label.toLowerCase()} slot
            </SheetSubtitle>
            <View style={[styles.shopGrid, { marginTop: 16, paddingBottom: 8 }]}>
              {COSMETICS.filter((c) => c.slot === openSheet).map((c) => (
                <ItemCard key={c.id} c={c} pet={pet} coins={state.coins} onBuy={() => buy(c)} onToggle={() => toggle(c)} />
              ))}
            </View>
            {pet.equipped[openSheet] ? (
              <Group style={{ marginTop: 8 }}>
                <Row
                  onPress={() => {
                    const c = cosmetic(pet.equipped[openSheet as CosmeticSlot]!);
                    if (c) toggle(c);
                  }}
                  title={`Remove ${cosmetic(pet.equipped[openSheet as CosmeticSlot]!)?.name}`}
                  destructive
                />
              </Group>
            ) : null}
          </>
        ) : null}
      </Sheet>

      {addPetSheet}

      <EditStatSheet
        open={editingStat === "weight"}
        onClose={() => setEditingStat(null)}
        title={`${pet.name}'s weight`}
        label={`Weight (${weightUnitLabel(state.units)})`}
        min={0.1}
        max={state.units === "lb" ? 260 : 120}
        unit={weightUnitLabel(state.units)}
        initialValue={kgToUnit(pet.weightKg, state.units)}
        onSave={(v) => {
          const kg = unitToKg(v, state.units);
          addWeight(pet.id, kg);
          toast("scale", `${pet.name}'s weight updated`, formatWeight(kg, state.units));
        }}
      />
      <EditStatSheet
        open={editingStat === "age"}
        onClose={() => setEditingStat(null)}
        title={`${pet.name}'s age`}
        label="Age (years)"
        min={0}
        max={30}
        unit="yr"
        initialValue={pet.ageYears}
        onSave={(ageYears) => {
          editPet(pet.id, { name: pet.name, breed: pet.breed, ageYears, weightKg: pet.weightKg, cupGrams: pet.cupGrams });
          toast("calendar", `${pet.name}'s age updated`, formatAge(ageYears));
        }}
      />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  petSwitcher: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 4, minHeight: 44 },
  petSwitcherName: { fontSize: 18, fontFamily: font.semibold, color: colors.label },
  stageCard: {
    marginTop: 8,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    overflow: "hidden",
    ...cardShadow,
  },
  stage: { alignItems: "center", paddingHorizontal: 20, paddingBottom: 20, paddingTop: 8 },
  petBox: { position: "relative", width: 200, height: 200, marginVertical: 28 },
  petCenter: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  slotButtonWrap: { position: "absolute", zIndex: 10 },
  slotButton: {
    width: HIT,
    height: HIT,
    borderRadius: HIT / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.sep,
    ...cardShadow,
  },
  dragHint: { marginTop: -16, marginBottom: 8, fontSize: 12, fontFamily: font.medium, color: colors.label3 },
  petName: { fontSize: 20, fontFamily: font.bold, letterSpacing: -0.2, color: colors.label },
  petBreed: { fontSize: 13, fontFamily: font.medium, color: colors.label2 },
  chipsRow: { marginTop: 10, flexDirection: "row", gap: 6 },
  otherButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: HIT,
    width: "100%",
    borderRadius: radius.md,
    backgroundColor: colors.fill,
  },
  otherButtonLabel: { fontSize: 15, fontFamily: font.semibold, color: colors.label },
  sheetTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  shopGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  itemCard: {
    flexBasis: "47%",
    flexGrow: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    padding: 14,
    ...cardShadow,
  },
  itemPreview: { aspectRatio: 2, borderRadius: radius.md, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
  itemName: { marginTop: 10, fontSize: 14, fontFamily: font.semibold, color: colors.label },
  itemButton: {
    height: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: radius.full,
  },
  itemButtonLabel: { fontSize: 13, fontFamily: font.semibold },
  suggestions: {
    marginTop: 6,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.sep,
    ...cardShadow,
  },
  suggestionRow: { paddingHorizontal: 16, paddingVertical: 10, minHeight: 40, justifyContent: "center" },
  suggestionLabel: { fontSize: 15, fontFamily: font.medium, color: colors.label },
  breedHint: { marginTop: 6, fontSize: 12, fontFamily: font.medium, color: colors.label3 },
});
