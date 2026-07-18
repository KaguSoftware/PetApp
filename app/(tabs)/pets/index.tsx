import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Defs, Line, RadialGradient, Rect, Stop } from "react-native-svg";
import NotificationBell from "@/components/NotificationBell";
import PageLoading from "@/components/PageLoading";
import PetAvatar from "@/components/PetAvatar";
import PixelPet, { PixelCosmetic } from "@/components/pixel/PixelPet";
import Pet3D from "@/components/pixel/Pet3D";
import { COIN_SPRITE } from "@/components/pixel/hudSprites";
import PixelSprite from "@/components/pixel/PixelSprite";
import { TabScreen } from "@/components/Screen";
import Sheet from "@/components/Sheet";
import { Icon } from "@/components/Icons";
import { AccentButton, Chevron, Chip, CoinPill, Group, Row, SectionHeader, Segmented } from "@/components/ui";
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
import { cardShadow, colors, font, HIT, radius } from "@/lib/theme";

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
        <Pressable
          onPress={onToggle}
          style={({ pressed }) => [
            styles.itemButton,
            { backgroundColor: equipped ? colors.greenSoft : colors.fill },
            pressed && { transform: [{ scale: 0.95 }] },
          ]}
        >
          {equipped ? <Icon name="check" size={14} color={colors.green} /> : null}
          <Text style={[styles.itemButtonLabel, { color: equipped ? colors.green : colors.label }]}>
            {equipped ? "Wearing" : "Put on"}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          disabled={!affordable}
          onPress={onBuy}
          style={({ pressed }) => [
            styles.itemButton,
            { backgroundColor: affordable ? colors.accentSoft : colors.fill },
            pressed && { transform: [{ scale: 0.95 }] },
          ]}
        >
          <PixelSprite sprite={COIN_SPRITE} size={13} />
          <Text style={[styles.itemButtonLabel, { color: affordable ? colors.accent : colors.label3 }]}>{c.price}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Small tap-to-edit sheet for a single numeric pet stat (weight or age) — the web's EditStatSheet. */
function StatSheet({
  open,
  onClose,
  title,
  label,
  initialValue,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  label: string;
  initialValue: number | undefined;
  onSave: (value: number) => void;
}) {
  const [value, setValue] = useState(initialValue != null ? String(initialValue) : "");
  // Re-sync the input whenever the sheet opens (or its target value changes
  // while open) — adjusting state during render avoids an effect round-trip.
  const [synced, setSynced] = useState({ open, initialValue });
  if (open && (synced.open !== open || synced.initialValue !== initialValue)) {
    setSynced({ open, initialValue });
    setValue(initialValue != null ? String(initialValue) : "");
  } else if (!open && synced.open !== open) {
    setSynced({ open, initialValue });
  }

  const parsed = Number(value);
  const valid = value.trim() !== "" && Number.isFinite(parsed) && parsed > 0;

  return (
    <Sheet open={open} onClose={onClose}>
      <Text style={styles.sheetTitle}>{title}</Text>
      <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
      <TextInput value={value} onChangeText={setValue} keyboardType="decimal-pad" style={styles.input} />
      <View style={{ marginTop: 28 }}>
        <AccentButton
          disabled={!valid}
          onPress={() => {
            onSave(parsed);
            onClose();
          }}
        >
          Save
        </AccentButton>
      </View>
    </Sheet>
  );
}

export default function PetsScreen() {
  const { state, hydrated, buyCosmetic, toggleEquip, addPet, addWeight, editPet, toast } = useStore();
  const searchParams = useLocalSearchParams<{ shop?: string }>();
  const [petId, setPetId] = useState(state.pets[0]?.id ?? "");
  const [openSheet, setOpenSheet] = useState<CosmeticSlot | "other" | null>(() => (searchParams.shop === "1" ? "other" : null));
  const [threeD, setThreeD] = useState(false);
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
      <TabScreen title="Pets" subtitle="Style your companion" trailing={<NotificationBell />}>
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
    hydrated &&
    petName.trim().length > 0 &&
    Number.isFinite(parsedAge) &&
    parsedAge >= 0 &&
    Number.isFinite(parsedWeightUnit) &&
    parsedWeightUnit > 0 &&
    Number.isFinite(parsedCup) &&
    parsedCup > 0;

  const addPetButton = (
    <Pressable onPress={openAddPet} style={({ pressed }) => [styles.addPetButton, pressed && { transform: [{ scale: 0.92 }] }]}>
      <Icon name="plus" size={16} color={colors.label2} />
      <Text style={styles.addPetButtonLabel}>Add pet</Text>
    </Pressable>
  );

  const addPetSheet = (
    <Sheet
      open={addPetOpen}
      onClose={() => {
        setAddPetOpen(false);
        resetAddPetForm();
      }}
    >
      <Text style={styles.sheetTitle}>Add a pet</Text>

      <Text style={styles.fieldLabel}>NAME</Text>
      <TextInput value={petName} onChangeText={setPetName} placeholder="e.g. Mochi" placeholderTextColor={colors.label3} style={styles.input} />

      <Text style={styles.fieldLabel}>SPECIES</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(
          [
            { s: "cat" as const, label: "Cat" },
            { s: "dog" as const, label: "Dog" },
          ]
        ).map((o) => (
          <Pressable
            key={o.s}
            onPress={() => {
              setSpecies(o.s);
              setBreed("");
              setBreedFocus(false);
              prefillFor(o.s);
            }}
            style={({ pressed }) => [styles.speciesChip, species === o.s && { backgroundColor: colors.accent }, pressed && { transform: [{ scale: 0.96 }] }]}
          >
            <Text style={[styles.speciesChipLabel, species === o.s && { color: colors.white }]}>{o.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.fieldLabel}>BREED</Text>
      <TextInput
        value={breed}
        onChangeText={setBreed}
        onFocus={() => setBreedFocus(true)}
        onBlur={() => setBreedFocus(false)}
        placeholder="Start typing a breed…"
        placeholderTextColor={colors.label3}
        autoComplete="off"
        autoCorrect={false}
        style={styles.input}
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

      <Text style={styles.fieldLabel}>SEX</Text>
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
          <Text style={styles.fieldLabel}>AGE (YEARS)</Text>
          <TextInput value={ageInput} onChangeText={setAgeInput} keyboardType="decimal-pad" placeholder="1" placeholderTextColor={colors.label3} style={styles.input} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>WEIGHT ({weightUnitLabel(state.units).toUpperCase()})</Text>
          <TextInput value={weightInput} onChangeText={setWeightInput} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.label3} style={styles.input} />
        </View>
      </View>

      <Text style={styles.fieldLabel}>CUP SIZE (GRAMS OF FOOD PER CUP)</Text>
      <TextInput value={cupInput} onChangeText={setCupInput} keyboardType="number-pad" placeholder="60" placeholderTextColor={colors.label3} style={styles.input} />

      <View style={{ marginTop: 28 }}>
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
          {hydrated ? "Add to family" : "Loading…"}
        </AccentButton>
      </View>
    </Sheet>
  );

  if (!pet) {
    return (
      <TabScreen
        title="Pets"
        subtitle="Style your companion"
        trailing={
          <>
            {addPetButton}
            <NotificationBell />
          </>
        }
      >
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
      trailing={
        <>
          <CoinPill amount={state.coins} />
          {addPetButton}
          <NotificationBell />
        </>
      }
    >
      {state.pets.length > 1 ? (
        <Pressable onPress={() => setPetPickerOpen(true)} style={({ pressed }) => [styles.petSwitcher, pressed && { opacity: 0.6 }]}>
          <Text style={styles.petSwitcherName}>{pet.name}</Text>
          <Chevron />
        </Pressable>
      ) : null}

      <Sheet open={petPickerOpen} onClose={() => setPetPickerOpen(false)}>
        <Text style={[styles.sheetTitle, { marginBottom: 12, paddingHorizontal: 4 }]}>Switch pet</Text>
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
        </Group>
      </Sheet>

      {/* Dressing stage */}
      <View style={styles.stageCard}>
        {/* 3D toggle */}
        <Pressable
          onPress={() => setThreeD((v) => !v)}
          accessibilityLabel="Toggle 3D view"
          accessibilityState={{ selected: threeD }}
          style={({ pressed }) => [styles.threeDToggle, pressed && { transform: [{ scale: 0.95 }] }]}
        >
          <Icon name="cube" size={15} color={threeD ? colors.accent : colors.label2} />
          <Text style={[styles.threeDLabel, threeD && { color: colors.accent }]}>3D</Text>
        </Pressable>

        <ArcadeStage style={styles.stage}>
          <View style={styles.petBox}>
            {threeD ? (
              <Pet3D pet={pet} size={176} />
            ) : (
              <>
                {/* Pixel pet on a soft platform shadow */}
                <View style={styles.platformShadow} />
                <Animated.View style={[styles.petCenter, bumpStyle]}>
                  <PixelPet pet={pet} size={168} idle />
                </Animated.View>
              </>
            )}

            {/* Head slot button — shows the pixel hat when equipped. Kept
                visible in 3D too so hat editing stays reachable; tucked into
                the top-left corner there, mirroring the 3D toggle on the right. */}
            {MAIN_SLOTS.map((s) => {
              const equippedId = pet.equipped[s.slot];
              return (
                <Pressable
                  key={s.slot}
                  onPress={() => setOpenSheet(s.slot)}
                  accessibilityLabel={`${s.label}: ${equippedId ? cosmetic(equippedId)?.name : "empty — tap to add"}`}
                  style={({ pressed }) => [
                    styles.slotButton,
                    threeD ? { left: -8, top: -8 } : { left: "50%", marginLeft: -22, top: -16 },
                    pressed && { transform: [{ scale: 0.9 }] },
                  ]}
                >
                  {equippedId ? <PixelCosmetic id={equippedId} size={24} /> : <Icon name="plus" size={19} color={colors.label2} />}
                </Pressable>
              );
            })}
          </View>

          {threeD ? <Text style={styles.dragHint}>Drag to spin</Text> : null}

          <Text style={styles.petName}>{pet.name}</Text>
          <Text style={styles.petBreed}>{pet.breed}</Text>
          <View style={styles.chipsRow}>
            <Pressable onPress={() => setEditingStat("age")} hitSlop={6}>
              <Chip>{formatAge(pet.ageYears)}</Chip>
            </Pressable>
            <Pressable onPress={() => setEditingStat("weight")} hitSlop={6}>
              <Chip>{formatWeight(pet.weightKg, state.units)}</Chip>
            </Pressable>
            <Chip>{pet.owned.length} items</Chip>
          </View>

          {/* Other accessories */}
          <Pressable onPress={() => setOpenSheet("other")} style={({ pressed }) => [styles.otherButton, pressed && { transform: [{ scale: 0.97 }] }]}>
            <Icon name="bag" size={17} color={colors.label} />
            <Text style={styles.otherButtonLabel}>Other accessories</Text>
          </Pressable>
        </ArcadeStage>
      </View>

      {/* Picker sheet */}
      <Sheet open={openSheet !== null} onClose={() => setOpenSheet(null)}>
        {openSheet === "other" ? (
          <>
            <View style={styles.sheetTitleRow}>
              <Text style={styles.sheetTitle}>Other accessories</Text>
              <CoinPill amount={state.coins} />
            </View>
            <Text style={styles.sheetSubtitle}>For {pet.name}</Text>
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
              <Text style={styles.sheetTitle}>{mainMeta.hint}</Text>
              <CoinPill amount={state.coins} />
            </View>
            <Text style={styles.sheetSubtitle}>
              For {pet.name} · {mainMeta.label.toLowerCase()} slot
            </Text>
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

      <StatSheet
        open={editingStat === "weight"}
        onClose={() => setEditingStat(null)}
        title={`${pet.name}'s weight`}
        label={`Weight (${weightUnitLabel(state.units)})`}
        initialValue={kgToUnit(pet.weightKg, state.units)}
        onSave={(v) => {
          const kg = unitToKg(v, state.units);
          addWeight(pet.id, kg);
          toast("scale", `${pet.name}'s weight updated`, formatWeight(kg, state.units));
        }}
      />
      <StatSheet
        open={editingStat === "age"}
        onClose={() => setEditingStat(null)}
        title={`${pet.name}'s age`}
        label="Age (years)"
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
  addPetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    paddingLeft: 10,
    paddingRight: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.sep,
  },
  addPetButtonLabel: { fontSize: 13, fontFamily: font.semibold, color: colors.label2 },
  petSwitcher: { marginBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 4, minHeight: 44 },
  petSwitcherName: { fontSize: 18, fontFamily: font.semibold, color: colors.label },
  stageCard: {
    marginTop: 8,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    overflow: "hidden",
    ...cardShadow,
  },
  threeDToggle: {
    position: "absolute",
    right: 12,
    top: 12,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.full,
    backgroundColor: colors.fill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 32,
  },
  threeDLabel: { fontSize: 12, fontFamily: font.semibold, color: colors.label2, lineHeight: 13 },
  stage: { alignItems: "center", paddingHorizontal: 20, paddingBottom: 20, paddingTop: 8 },
  petBox: { position: "relative", width: 176, height: 176, marginVertical: 32 },
  petCenter: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  platformShadow: {
    position: "absolute",
    bottom: 4,
    left: "50%",
    marginLeft: -48,
    width: 96,
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(58, 57, 69, 0.18)",
  },
  slotButton: {
    position: "absolute",
    zIndex: 10,
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
    marginTop: 20,
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
  sheetTitle: { fontSize: 20, fontFamily: font.bold, letterSpacing: -0.2, color: colors.label },
  sheetSubtitle: { marginTop: 2, fontSize: 13, fontFamily: font.regular, color: colors.label2 },
  shopGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  itemCard: {
    flexBasis: "47%",
    flexGrow: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    padding: 14,
    shadowColor: "#3a3945",
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  itemPreview: { aspectRatio: 2, borderRadius: radius.md, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
  itemName: { marginTop: 10, fontSize: 14, fontFamily: font.semibold, color: colors.label },
  itemButton: {
    marginTop: 10,
    height: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: radius.full,
  },
  itemButtonLabel: { fontSize: 13, fontFamily: font.semibold },
  speciesChip: {
    borderRadius: radius.full,
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.sep,
  },
  speciesChipLabel: { fontSize: 14, fontFamily: font.semibold, color: colors.label },
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
  fieldLabel: { marginTop: 20, marginBottom: 6, fontSize: 13, fontFamily: font.semibold, letterSpacing: 0.8, color: colors.label2 },
  input: {
    width: "100%",
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: font.medium,
    color: colors.label,
  },
});
