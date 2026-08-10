import { useRouter } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icons";
import { PressableScale } from "@/components/ui";
import type { Pet } from "@/lib/data";
import { energyBasis } from "@/lib/nutrition";
import { cardShadow, font, radius, useColors, type Colors } from "@/lib/theme";

/**
 * The Nutrition entry point on the Care tab — the page's opening statement.
 *
 * A white card set in ink, with the brand violet only as accents: the icon
 * disc, the chevron and the stat pills. Louder than the tiles below through
 * size and position rather than a saturated fill (the owner tried the filled
 * violet panel and asked for white and black with purple accents).
 *
 * The stat pills are live: the household's daily energy, split per pet when
 * there is a household to split. A button worth glancing at before opening.
 */
export default function NutritionHero({ pets }: { pets: Pet[] }) {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();

  const perPet = useMemo(() => pets.map((p) => ({ pet: p, kcal: energyBasis(p).kcal })), [pets]);
  const total = perPet.reduce((sum, p) => sum + p.kcal, 0);
  const solo = pets.length === 1 ? pets[0] : undefined;

  const pills = [
    `${total.toLocaleString()} kcal a day`,
    ...(pets.length > 1 && pets.length <= 3 ? perPet.map((p) => `${p.pet.name} ${p.kcal.toLocaleString()}`) : []),
  ];

  return (
    <PressableScale
      haptic
      onPress={() => router.push(solo ? { pathname: "/nutrition", params: { petId: solo.id } } : "/nutrition")}
      accessibilityRole="button"
      accessibilityLabel={`Nutrition. ${pills.join(", ")}.`}
      style={s.wrap}
    >
      <View style={s.card}>
        <View style={s.top}>
          <View style={s.iconCircle}>
            <Icon name="bowl" size={22} color={colors.accent} strokeWidth={2.2} />
          </View>
          <View style={s.headText}>
            <Text style={s.title}>Nutrition</Text>
            <Text style={s.subtitle}>
              What to feed {solo ? solo.name : "them"}, what to avoid, and what it costs
            </Text>
          </View>
          <Icon name="chevron-right" size={18} color={colors.accent} strokeWidth={2.6} />
        </View>
        <View style={s.pills}>
          {pills.map((p) => (
            <View key={p} style={s.pill}>
              <Text style={s.pillLabel}>{p}</Text>
            </View>
          ))}
        </View>
      </View>
    </PressableScale>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    wrap: { marginTop: 14, marginBottom: 2 },
    card: {
      borderRadius: radius.xl,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.sep,
      paddingHorizontal: 18,
      paddingVertical: 18,
      gap: 14,
      ...cardShadow,
    },
    top: { flexDirection: "row", alignItems: "center", gap: 14 },
    iconCircle: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    headText: { flex: 1, minWidth: 0, gap: 3 },
    title: { fontSize: 21, fontFamily: font.bold, letterSpacing: -0.4, color: colors.label },
    subtitle: { fontSize: 13, lineHeight: 18, fontFamily: font.medium, color: colors.label2 },
    pills: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    pill: { borderRadius: radius.full, backgroundColor: colors.accentSoft, paddingHorizontal: 11, paddingVertical: 6 },
    pillLabel: { fontSize: 12, fontFamily: font.bold, letterSpacing: 0.1, color: colors.accent },
  });
