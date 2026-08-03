import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icons";
import PageLoading from "@/components/PageLoading";
import PetSelectorRow from "@/components/PetSelectorRow";
import { PushedScreen } from "@/components/Screen";
import { PressableScale } from "@/components/ui";
import { Reveal } from "@/components/nutrition/atoms";
import { VetDisclaimer } from "@/components/nutrition/sections";
import type { Pet } from "@/lib/data";
import { currencySymbol, useFoodPricing } from "@/lib/foodPricing";
import {
  computeCost,
  energyBasis,
  fillCopy,
  formatsFor,
  hasBreedProfile,
  mealCountLabel,
  nutritionFor,
  NUTRITION_SECTIONS,
  portionGrams,
  recipesFor,
  FORMAT_LABEL,
  NEVER_FEED,
  type SectionId,
} from "@/lib/nutrition";
import { useStore } from "@/lib/store";
import { cardShadow, font, radius, useColors, type Colors } from "@/lib/theme";

/**
 * Nutrition — the hub.
 *
 * The first build of this feature put all five subjects end to end on one
 * scroll and it read as a wall: by the time you reached the cost calculator you
 * had passed a spec panel, a ranked format list, three ingredient bands and a
 * recipe rail. This screen is the fix. It orients you in about ten seconds — the
 * breed's dietary thesis, then three numbers — and then hands you a menu where
 * every row says what is behind it before you tap.
 *
 * Each row carries a live value on the right, so the menu is useful even if you
 * never open anything, and so the numbers aren't hidden a level down.
 */
export default function NutritionHub() {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { state, hydrated } = useStore();
  const { petId: paramPetId } = useLocalSearchParams<{ petId?: string }>();
  const [petId, setPetId] = useState(paramPetId ?? state.pets[0]?.id ?? "");

  if (!hydrated) {
    return (
      <PushedScreen title="Nutrition">
        <PageLoading />
      </PushedScreen>
    );
  }

  const pet = state.pets.find((p) => p.id === petId) ?? state.pets[0];
  if (!pet) {
    return (
      <PushedScreen title="Nutrition">
        <Text style={s.empty}>Add a pet first and this fills in with their own numbers.</Text>
      </PushedScreen>
    );
  }

  return (
    <PushedScreen title="Nutrition">
      {state.pets.length > 1 ? <PetSelectorRow pets={state.pets} selectedId={pet.id} onSelect={setPetId} /> : null}
      <HubBody key={pet.id} pet={pet} onOpen={(id) => router.push({ pathname: "/nutrition/[section]", params: { section: id, petId: pet.id } })} />
      <VetDisclaimer pet={pet} />
    </PushedScreen>
  );
}

/**
 * Keyed on the pet so switching animals re-runs the reveal and re-seeds every
 * derived figure, rather than leaving stale numbers behind a fade.
 */
function HubBody({ pet, onOpen }: { pet: Pet; onOpen: (id: SectionId) => void }) {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { currency, prices } = useFoodPricing(pet.id);

  const profile = useMemo(() => nutritionFor(pet), [pet]);
  const basis = useMemo(() => energyBasis(pet), [pet]);
  const bestFormat = useMemo(() => formatsFor(pet)[0]?.id ?? "dry", [pet]);
  const recipeCount = useMemo(() => recipesFor(pet).length, [pet]);
  const breedSpecific = hasBreedProfile(pet);

  const perDay = useMemo(() => {
    const costs = (Object.keys(prices) as (keyof typeof prices)[])
      .map((id) => {
        const p = prices[id];
        if (!p) return undefined;
        return computeCost({
          price: p.price,
          packGrams: p.packGrams,
          packCount: p.packCount,
          gramsPerDay: portionGrams(pet, id, p.kcalPer100g),
          kcalPer100g: p.kcalPer100g,
        })?.perDay;
      })
      .filter((v): v is number => v != null);
    return costs.length ? Math.min(...costs) : undefined;
  }, [prices, pet]);

  /** The right-hand value on each menu row. Kept short — it's a glance, not a summary. */
  const teaser: Record<SectionId, string> = {
    targets: `${basis.kcal.toLocaleString()} kcal`,
    food: FORMAT_LABEL[bestFormat],
    bowl: `${NEVER_FEED[pet.species].length} to avoid`,
    recipes: `${recipeCount} recipes`,
    cost: perDay != null ? `${currencySymbol(currency)}${perDay.toFixed(2)}/day` : "Set up",
  };

  return (
    <>
      {/* ── Thesis: the whole feature's argument, in about twenty words ────── */}
      <Reveal>
        <View style={s.thesis}>
          <View style={s.thesisMark}>
            <View style={s.thesisRule} />
            <Text style={s.thesisKicker}>
              {breedSpecific ? `Vet-built · ${pet.breed}` : `${pet.species === "cat" ? "Cat" : "Dog"} baseline`}
            </Text>
          </View>
          <Text style={s.thesisHeadline}>{profile.headline}</Text>
          <Text style={s.thesisBody}>{fillCopy(profile.body, pet)}</Text>
        </View>
      </Reveal>

      {/* ── Three numbers, then everything else is a tap away ──────────────── */}
      <Reveal delay={60}>
        <View style={s.glance}>
          <GlanceCell colors={colors} value={basis.kcal.toLocaleString()} unit="kcal / day" />
          <View style={s.glanceDivider} />
          <GlanceCell colors={colors} value={portionGrams(pet, bestFormat).toLocaleString()} unit={`g ${FORMAT_LABEL[bestFormat].toLowerCase()}`} />
          <View style={s.glanceDivider} />
          <GlanceCell colors={colors} value={mealCountLabel(profile)} unit="meals a day" />
        </View>
      </Reveal>

      {!breedSpecific ? (
        <Text style={s.fallbackNote}>
          {pet.breed} isn&apos;t on our vet-built breed list yet, so this is the general {pet.species} guidance. The numbers
          still come from {pet.name}&apos;s own age and weight.
        </Text>
      ) : null}

      {/* ── The menu ───────────────────────────────────────────────────────── */}
      <Text style={s.menuLabel}>In detail</Text>
      <View style={s.menu}>
        {NUTRITION_SECTIONS.map((section, i) => (
          <PressableScale
            key={section.id}
            haptic
            onPress={() => onOpen(section.id)}
            accessibilityRole="button"
            accessibilityLabel={`${fillCopy(section.title, pet)}. ${fillCopy(section.blurb, pet)}`}
          >
            <View style={[s.menuRow, i === 0 && s.menuRowTop]}>
              <View style={s.menuIcon}>
                <Icon name={section.icon} size={19} color={colors.accent} strokeWidth={2.2} />
              </View>
              <View style={s.menuText}>
                <View style={s.menuHead}>
                  <Text style={s.menuTitle} numberOfLines={1}>
                    {fillCopy(section.title, pet)}
                  </Text>
                  <Text style={s.menuTeaser}>{teaser[section.id]}</Text>
                </View>
                <Text style={s.menuBlurb}>{fillCopy(section.blurb, pet)}</Text>
              </View>
              <Icon name="chevron-right" size={15} color={colors.label3} strokeWidth={2.2} />
            </View>
          </PressableScale>
        ))}
      </View>
    </>
  );
}

function GlanceCell({ colors, value, unit }: { colors: Colors; value: string; unit: string }) {
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={s.glanceCell}>
      <Text style={s.glanceValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      <Text style={s.glanceUnit} numberOfLines={2}>
        {unit}
      </Text>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    empty: { marginTop: 40, textAlign: "center", fontSize: 15, lineHeight: 22, fontFamily: font.regular, color: colors.label2 },

    thesis: { paddingTop: 6, paddingHorizontal: 4, paddingBottom: 20 },
    thesisMark: { flexDirection: "row", alignItems: "center", gap: 9 },
    thesisRule: { width: 22, height: 2, borderRadius: 1, backgroundColor: colors.accent },
    thesisKicker: { fontSize: 11, fontFamily: font.bold, letterSpacing: 1.1, textTransform: "uppercase", color: colors.accent },
    // 29pt against a 15pt body — a ~2× step, so the thesis reads as a statement
    // rather than as another heading.
    thesisHeadline: { marginTop: 12, fontSize: 29, lineHeight: 34, fontFamily: font.bold, letterSpacing: -0.9, color: colors.label },
    thesisBody: { marginTop: 11, fontSize: 15, lineHeight: 24, fontFamily: font.regular, color: colors.label2, maxWidth: 560 },

    glance: {
      flexDirection: "row",
      alignItems: "stretch",
      borderRadius: radius.lg,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.sep,
      paddingVertical: 16,
      ...cardShadow,
    },
    glanceCell: { flex: 1, minWidth: 0, alignItems: "center", paddingHorizontal: 8, gap: 3 },
    glanceDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.sep, marginVertical: 2 },
    glanceValue: { fontSize: 24, fontFamily: font.bold, letterSpacing: -0.6, color: colors.label, fontVariant: ["tabular-nums"] },
    glanceUnit: { fontSize: 11, lineHeight: 14, fontFamily: font.semibold, letterSpacing: 0.3, textTransform: "uppercase", color: colors.label3, textAlign: "center" },

    fallbackNote: { marginTop: 14, paddingHorizontal: 4, fontSize: 13, lineHeight: 19, fontFamily: font.medium, color: colors.label3 },

    menuLabel: {
      marginTop: 30,
      marginBottom: 10,
      paddingHorizontal: 4,
      fontSize: 11.5,
      fontFamily: font.bold,
      letterSpacing: 1,
      textTransform: "uppercase",
      color: colors.label2,
    },
    menu: {
      borderRadius: radius.lg,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.sep,
      overflow: "hidden",
      ...cardShadow,
    },
    menuRow: {
      flexDirection: "row",
      gap: 13,
      paddingHorizontal: 15,
      paddingVertical: 15,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.sep,
    },
    menuRowTop: { borderTopWidth: 0 },
    menuIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
    menuText: { flex: 1, minWidth: 0, gap: 4 },
    menuHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10 },
    menuTitle: { flex: 1, minWidth: 0, fontSize: 16, fontFamily: font.semibold, color: colors.label },
    menuTeaser: { flexShrink: 0, fontSize: 12.5, fontFamily: font.bold, color: colors.accent, fontVariant: ["tabular-nums"] },
    menuBlurb: { fontSize: 13, lineHeight: 19, fontFamily: font.regular, color: colors.label2 },
  });
