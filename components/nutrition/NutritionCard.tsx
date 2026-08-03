import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icons";
import { PressableScale } from "@/components/ui";
import type { Pet } from "@/lib/data";
import { currencySymbol, useFoodPricing } from "@/lib/foodPricing";
import { computeCost, energyBasis, FORMAT_LABEL, formatsFor, portionGrams } from "@/lib/nutrition";
import { floatShadow, font, lightColors, radius, useColors, withAlpha, type Colors } from "@/lib/theme";

/**
 * The Nutrition entry point on the Care tab.
 *
 * Deliberately the loudest thing on that screen. Everything else there is a
 * white inset-grouped card, so one saturated brand-violet panel is enough to
 * pull the eye without any decoration — no glass, no glow, no gradient text.
 *
 * The colours come from the LIGHT ramp in both themes, on purpose. In dark mode
 * `colors.accent` is a pale lavender tuned for text on a dark page; a card
 * filled with it would leave white type at about 2:1. The light ramp's deeper
 * violet keeps white above 5:1 either way, and a saturated panel reads even
 * better against the dark page than it does against the light one.
 *
 * The stat pills are live: they turn a button into a glance worth taking, and
 * they show the feature already knows something about this animal before you
 * commit to opening it.
 */
export default function NutritionCard({ pet }: { pet: Pet }) {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { currency, prices } = useFoodPricing(pet.id);

  const basis = useMemo(() => energyBasis(pet), [pet]);
  const bestFormat = useMemo(() => formatsFor(pet)[0]?.id ?? "dry", [pet]);

  // Cheapest per-day figure across whatever the family has priced, so the card
  // can show a real number once they've used the calculator once.
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

  const pills = [
    `${basis.kcal.toLocaleString()} kcal/day`,
    FORMAT_LABEL[bestFormat],
    perDay != null ? `${currencySymbol(currency)}${perDay.toFixed(2)}/day` : null,
  ].filter((v): v is string => v != null);

  return (
    <PressableScale
      haptic
      onPress={() => router.push({ pathname: "/nutrition", params: { petId: pet.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Nutrition for ${pet.name}. ${pills.join(", ")}.`}
      style={s.wrap}
    >
      <LinearGradient
        colors={[lightColors.accent, lightColors.accentDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.card}
      >
        <View style={s.top}>
          <View style={s.iconCircle}>
            <Icon name="bowl" size={22} color={colors.white} strokeWidth={2.2} />
          </View>
          <View style={s.headText}>
            <Text style={s.title}>Nutrition</Text>
            <Text style={s.subtitle}>What to feed {pet.name}, what to avoid, and what it costs</Text>
          </View>
          <Icon name="chevron-right" size={18} color={withAlpha(colors.white, 0.75)} strokeWidth={2.6} />
        </View>
        <View style={s.pills}>
          {pills.map((p) => (
            <View key={p} style={s.pill}>
              <Text style={s.pillLabel}>{p}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>
    </PressableScale>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    wrap: { marginTop: 14, marginBottom: 6 },
    card: { borderRadius: radius.xl, paddingHorizontal: 18, paddingVertical: 18, gap: 16, ...floatShadow, shadowColor: lightColors.accent, shadowOpacity: 0.3 },
    top: { flexDirection: "row", alignItems: "center", gap: 14 },
    iconCircle: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: withAlpha(colors.white, 0.18),
      alignItems: "center",
      justifyContent: "center",
    },
    headText: { flex: 1, minWidth: 0, gap: 3 },
    title: { fontSize: 21, fontFamily: font.bold, letterSpacing: -0.4, color: colors.white },
    subtitle: { fontSize: 13, lineHeight: 18, fontFamily: font.medium, color: withAlpha(colors.white, 0.8) },
    pills: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    pill: { borderRadius: radius.full, backgroundColor: withAlpha(colors.white, 0.16), paddingHorizontal: 11, paddingVertical: 6 },
    pillLabel: { fontSize: 12, fontFamily: font.bold, letterSpacing: 0.1, color: colors.white },
  });
