import EditStatSheet from "@/components/EditStatSheet";
import HeaderActions from "@/components/HeaderActions";
import { Icon } from "@/components/Icons";
import PageLoading from "@/components/PageLoading";
import PetSelectorRow from "@/components/PetSelectorRow";
import { COIN_SPRITE } from "@/components/pixel/hudSprites";
import Pet3D from "@/components/pixel/Pet3D";
import { PixelCosmetic } from "@/components/pixel/PixelPet";
import PixelSprite from "@/components/pixel/PixelSprite";
import { TabScreen } from "@/components/Screen";
import Sheet from "@/components/Sheet";
import {
  AccentButton,
  Chevron,
  Chip,
  CoinPill,
  Group,
  IconCircle,
  PRESS_SCALE_SMALL,
  PressableScale,
  Row,
  SectionHeader,
  Segmented,
  SheetSubtitle,
  SheetTitle,
} from "@/components/ui";
import {
  cmToUnit,
  cosmetic,
  COSMETICS,
  formatAge,
  formatLength,
  formatWeight,
  kgToUnit,
  lengthUnitLabel,
  unitToCm,
  unitToKg,
  weightUnitLabel,
  type Cosmetic,
  type CosmeticSlot,
  type Pet,
} from "@/lib/data";
import { useStore } from "@/lib/store";
import { cardShadow, font, HIT, radius, useColors, type Colors } from "@/lib/theme";
import { usePullToRefresh } from "@/lib/useRefresh";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Defs, Line, RadialGradient, Rect, Stop } from "react-native-svg";

/* One main slot gets a floating + button on the avatar's head; the rest live in "Other accessories" */
const MAIN_SLOTS: { slot: CosmeticSlot; label: string; hint: string }[] = [{ slot: "head", label: "Hat", hint: "Hats & headwear" }];

const OTHER_SLOTS: { slot: CosmeticSlot; hint: string }[] = [
  { slot: "face", hint: "Glasses & eyewear" },
  { slot: "neck", hint: "Collars & scarves" },
  { slot: "body", hint: "Outfits & capes" },
];

const GRID_STEP = 14;

/** Arcade backdrop: soft radial glow near the top + faint 14px retro grid. */
function ArcadeStage({ children, style }: { children: React.ReactNode; style?: object }) {
  const colors = useColors();
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
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { state, hydrated, buyCosmetic, toggleEquip, addWeight, editPet, toast } = useStore();
  const router = useRouter();
  const refreshControl = usePullToRefresh();
  const searchParams = useLocalSearchParams<{ shop?: string }>();
  const [petId, setPetId] = useState(state.pets[0]?.id ?? "");
  const [accessoriesOpen, setAccessoriesOpen] = useState(() => searchParams.shop === "1");
  // Which tab the accessories sheet shows: the head/hat slot, or "other" for everything else.
  const [accessoryTab, setAccessoryTab] = useState<CosmeticSlot | "other">("head");
  const [editingStat, setEditingStat] = useState<"weight" | "age" | "height" | "length" | null>(null);

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
  const openAccessories = (tab: CosmeticSlot | "other") => {
    setAccessoryTab(tab);
    setAccessoriesOpen(true);
  };
  const mainMeta = MAIN_SLOTS.find((s) => s.slot === accessoryTab);

  if (!hydrated)
    return (
      <TabScreen title="Pets" subtitle="Style your companion" trailing={<HeaderActions showCoins />} refreshControl={refreshControl}>
        <PageLoading />
      </TabScreen>
    );

  const openAddPet = () => router.push("/pet/new");

  if (!pet) {
    return (
      <TabScreen title="Pets" subtitle="Style your companion" trailing={<HeaderActions showCoins />} refreshControl={refreshControl}>
        <View style={{ marginTop: 16 }}>
          <AccentButton onPress={openAddPet}>Add a pet</AccentButton>
        </View>
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
      trailing={<HeaderActions showCoins />}
      refreshControl={refreshControl}
    >
      {/* Same avatar-row selector as the Logs tab, with a trailing "+" tile
          so adding a pet stays one tap away. */}
      <PetSelectorRow pets={state.pets} selectedId={pet.id} onSelect={setPetId} onAdd={openAddPet} />

      {/* Dressing stage — always the real voxel 3D pet (no 2D/3D toggle). */}
      <View style={styles.stageCard}>
        <ArcadeStage style={styles.stage}>
          <View style={styles.petBox}>
            <Animated.View style={[styles.petCenter, bumpStyle]}>
              <Pet3D pet={pet} size={200} />
            </Animated.View>
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
            <PressableScale
              scaleTo={PRESS_SCALE_SMALL}
              onPress={() => setEditingStat("height")}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Height ${pet.heightCm != null ? formatLength(pet.heightCm, state.units) : "not set"} — tap to edit`}
            >
              <Chip>{pet.heightCm != null ? formatLength(pet.heightCm, state.units) : "Height —"}</Chip>
            </PressableScale>
            <PressableScale
              scaleTo={PRESS_SCALE_SMALL}
              onPress={() => setEditingStat("length")}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Length ${pet.lengthCm != null ? formatLength(pet.lengthCm, state.units) : "not set"} — tap to edit`}
            >
              <Chip>{pet.lengthCm != null ? formatLength(pet.lengthCm, state.units) : "Length —"}</Chip>
            </PressableScale>
            <Chip>{`${pet.owned.length} items`}</Chip>
          </View>

          {/* Accessories — opens a sheet with Hats / Other tabs */}
          <PressableScale onPress={() => openAccessories("head")} accessibilityRole="button" style={{ marginTop: 20, width: "100%" }}>
            <View style={styles.otherButton}>
              <Icon name="bag" size={17} color={colors.label} />
              <Text style={styles.otherButtonLabel}>Accessories</Text>
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

      {/* Accessories sheet — one place for Hats & other accessories, toggled at the top */}
      <Sheet open={accessoriesOpen} onClose={() => setAccessoriesOpen(false)}>
        <View style={styles.sheetTitleRow}>
          <SheetTitle>Accessories</SheetTitle>
          <CoinPill amount={state.coins} />
        </View>
        <SheetSubtitle>For {pet.name}</SheetSubtitle>
        <View style={{ marginTop: 12, marginBottom: 4 }}>
          <Segmented
            options={[
              { value: "head", label: "Hats" },
              { value: "other", label: "Other accessories" },
            ]}
            value={accessoryTab === "other" ? "other" : "head"}
            onChange={(v) => setAccessoryTab(v as CosmeticSlot | "other")}
          />
        </View>

        {accessoryTab === "other" ? (
          OTHER_SLOTS.map((s) => (
            <View key={s.slot}>
              <SectionHeader>{s.hint}</SectionHeader>
              <View style={styles.shopGrid}>
                {COSMETICS.filter((c) => c.slot === s.slot && (!c.restrictGender || c.restrictGender === pet.gender)).map((c) => (
                  <ItemCard key={c.id} c={c} pet={pet} coins={state.coins} onBuy={() => buy(c)} onToggle={() => toggle(c)} />
                ))}
              </View>
            </View>
          ))
        ) : mainMeta ? (
          <>
            <SectionHeader>{mainMeta.hint}</SectionHeader>
            <View style={styles.shopGrid}>
              {COSMETICS.filter((c) => c.slot === accessoryTab && (!c.restrictGender || c.restrictGender === pet.gender)).map((c) => (
                <ItemCard key={c.id} c={c} pet={pet} coins={state.coins} onBuy={() => buy(c)} onToggle={() => toggle(c)} />
              ))}
            </View>
            {pet.equipped[accessoryTab] ? (
              <Group style={{ marginTop: 8 }}>
                <Row
                  onPress={() => {
                    const c = cosmetic(pet.equipped[accessoryTab as CosmeticSlot]!);
                    if (c) toggle(c);
                  }}
                  title={`Remove ${cosmetic(pet.equipped[accessoryTab as CosmeticSlot]!)?.name}`}
                  destructive
                />
              </Group>
            ) : null}
          </>
        ) : null}
      </Sheet>

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
          editPet(pet.id, {
            name: pet.name,
            breed: pet.breed,
            ageYears,
            weightKg: pet.weightKg,
            cupGrams: pet.cupGrams,
            heightCm: pet.heightCm,
            lengthCm: pet.lengthCm,
          });
          toast("calendar", `${pet.name}'s age updated`, formatAge(ageYears));
        }}
      />
      <EditStatSheet
        open={editingStat === "height"}
        onClose={() => setEditingStat(null)}
        title={`${pet.name}'s height`}
        label={`Height (${lengthUnitLabel(state.units)})`}
        min={state.units === "lb" ? 2 : 5}
        max={state.units === "lb" ? 60 : 150}
        unit={lengthUnitLabel(state.units)}
        initialValue={pet.heightCm != null ? cmToUnit(pet.heightCm, state.units) : undefined}
        onSave={(v) => {
          const heightCm = unitToCm(v, state.units);
          editPet(pet.id, { name: pet.name, breed: pet.breed, ageYears: pet.ageYears, weightKg: pet.weightKg, cupGrams: pet.cupGrams, heightCm, lengthCm: pet.lengthCm });
          toast("scale", `${pet.name}'s height updated`, formatLength(heightCm, state.units));
        }}
      />
      <EditStatSheet
        open={editingStat === "length"}
        onClose={() => setEditingStat(null)}
        title={`${pet.name}'s length`}
        label={`Length (${lengthUnitLabel(state.units)})`}
        min={state.units === "lb" ? 4 : 10}
        max={state.units === "lb" ? 120 : 300}
        unit={lengthUnitLabel(state.units)}
        initialValue={pet.lengthCm != null ? cmToUnit(pet.lengthCm, state.units) : undefined}
        onSave={(v) => {
          const lengthCm = unitToCm(v, state.units);
          editPet(pet.id, { name: pet.name, breed: pet.breed, ageYears: pet.ageYears, weightKg: pet.weightKg, cupGrams: pet.cupGrams, heightCm: pet.heightCm, lengthCm });
          toast("scale", `${pet.name}'s length updated`, formatLength(lengthCm, state.units));
        }}
      />
    </TabScreen>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  stageCard: {
    marginTop: 8,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    overflow: "hidden",
    ...cardShadow,
  },
  stage: { alignItems: "center", paddingHorizontal: 20, paddingBottom: 20, paddingTop: 8 },
  // Sized to the 200pt pet PLUS the slot-button overhang on each side, so the
  petBox: {
    position: "relative",
    width: 200,
    height: 200,
    marginVertical: 28,
  },
  // Fills petBox so the 200pt pet stays optically centred inside the box.
  petCenter: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
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
  breedHint: { marginTop: 6, fontSize: 12, fontFamily: font.medium, color: colors.label3 },
});
