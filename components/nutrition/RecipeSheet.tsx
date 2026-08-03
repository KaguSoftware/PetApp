import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icons";
import Sheet from "@/components/Sheet";
import { PressableScale, SelectableChip } from "@/components/ui";
import { Eyebrow } from "@/components/nutrition/atoms";
import type { Pet } from "@/lib/data";
import { energyBasis, gramsForDensity, scaleRecipe, RECIPE_WARNING, type Recipe } from "@/lib/nutrition";
import { font, radius, useColors, withAlpha, type Colors } from "@/lib/theme";

/**
 * A recipe, scaled to the animal in front of you.
 *
 * The scaling is the point. A recipe that says "2 cups of rice" is useless
 * across a 4 kg cat and a 40 kg Rottweiler, and — the mistake worth designing
 * out — home-cooked food runs at roughly a third of kibble's energy density, so
 * carrying a kibble gram figure over would under-feed by a factor of three.
 * Portions are computed from calories (`energyBasis`) and the recipe's own
 * density, then multiplied out to a batch the family will actually cook.
 *
 * The completeness warning is not a footnote and is not collapsible. Meat, rice
 * and vegetables are genuinely missing calcium, taurine, zinc and several
 * vitamins, and a family that cooks this for months without a formulated
 * supplement will do real harm with the best of intentions.
 */

/** Batch sizes offered — how many days of food to cook at once. */
const BATCHES = [1, 3, 5, 7];

export default function RecipeSheet({
  pet,
  recipe,
  open,
  onClose,
}: {
  pet: Pet;
  recipe: Recipe | null;
  open: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [days, setDays] = useState(3);

  const basis = useMemo(() => energyBasis(pet), [pet]);
  const perDay = recipe ? gramsForDensity(basis.kcal, recipe.kcalPer100g) : 0;
  const batchGrams = perDay * days;
  const rows = recipe ? scaleRecipe(recipe, batchGrams) : [];

  return (
    <Sheet open={open} onClose={onClose}>
      {recipe ? (
        <View>
          <Eyebrow tint={colors.accent}>{recipe.suits}</Eyebrow>
          <Text style={s.title}>{recipe.name}</Text>

          <View style={s.metaRow}>
            <View style={s.metaItem}>
              <Icon name="clock" size={13} color={colors.label2} strokeWidth={2.2} />
              <Text style={s.metaText}>{recipe.minutes} min</Text>
            </View>
            <View style={s.metaDot} />
            <View style={s.metaItem}>
              <Icon name="flame" size={13} color={colors.label2} strokeWidth={2.2} />
              <Text style={s.metaText}>{recipe.kcalPer100g} kcal / 100 g</Text>
            </View>
          </View>

          {/* Portion, front and centre — the number the family came for. */}
          <View style={s.portion}>
            <View style={s.portionMain}>
              <Text style={s.portionValue}>{perDay.toLocaleString()}</Text>
              <Text style={s.portionUnit}>g a day for {pet.name}</Text>
            </View>
            <Text style={s.portionBasis}>
              {basis.kcal.toLocaleString()} kcal ÷ {recipe.kcalPer100g} kcal per 100 g. Cooked food is mostly water, so this
              weighs far more than the same energy in kibble.
            </Text>
          </View>

          <Text style={s.sectionLabel}>Cook a batch of</Text>
          <View style={s.batchRow}>
            {BATCHES.map((d) => (
              <SelectableChip
                key={d}
                label={d === 1 ? "1 day" : `${d} days`}
                selected={days === d}
                onPress={() => setDays(d)}
              />
            ))}
          </View>
          <Text style={s.batchHint}>
            {batchGrams.toLocaleString()} g in total. Keeps three days in the fridge — freeze anything beyond that in daily
            portions.
          </Text>

          <Text style={s.sectionLabel}>Ingredients</Text>
          <View style={s.card}>
            {rows.map((r, i) => (
              <View key={r.item} style={[s.ingredientRow, i === rows.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={s.ingredientText}>
                  <Text style={s.ingredientName}>{r.item}</Text>
                  {r.note ? <Text style={s.ingredientNote}>{r.note}</Text> : null}
                </View>
                <Text style={s.ingredientGrams}>{r.grams.toLocaleString()} g</Text>
              </View>
            ))}
          </View>

          <Text style={s.sectionLabel}>Method</Text>
          <View style={s.steps}>
            {recipe.steps.map((step, i) => (
              <View key={step} style={s.stepRow}>
                <View style={s.stepNum}>
                  <Text style={s.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={s.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          <Text style={s.sectionLabel}>Why this works</Text>
          <Text style={s.why}>{recipe.why}</Text>

          {/* Non-collapsible, tonal, and last — the thing to be holding when you
              close the sheet. */}
          <View style={s.warning}>
            <View style={s.warningHead}>
              <Icon name="alert" size={16} color={colors.orange} strokeWidth={2.4} />
              <Text style={s.warningTitle}>This is not a complete diet on its own</Text>
            </View>
            <Text style={s.warningBody}>{RECIPE_WARNING}</Text>
          </View>

          <PressableScale onPress={onClose} accessibilityRole="button">
            <View style={s.done}>
              <Text style={s.doneLabel}>Done</Text>
            </View>
          </PressableScale>
        </View>
      ) : null}
    </Sheet>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    title: { marginTop: 6, fontSize: 26, fontFamily: font.bold, letterSpacing: -0.6, color: colors.label },
    metaRow: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 10 },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    metaText: { fontSize: 13, fontFamily: font.medium, color: colors.label2 },
    metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.label3 },

    portion: { marginTop: 20, padding: 16, borderRadius: radius.lg, backgroundColor: colors.accentSoft, gap: 8 },
    portionMain: { flexDirection: "row", alignItems: "baseline", gap: 8 },
    portionValue: { fontSize: 38, lineHeight: 42, fontFamily: font.bold, letterSpacing: -1.2, color: colors.accentDeep, fontVariant: ["tabular-nums"] },
    portionUnit: { fontSize: 15, fontFamily: font.semibold, color: colors.accentDeep, flexShrink: 1 },
    portionBasis: { fontSize: 12.5, fontFamily: font.regular, lineHeight: 18, color: colors.label2 },

    sectionLabel: {
      marginTop: 26,
      marginBottom: 10,
      fontSize: 11.5,
      fontFamily: font.bold,
      letterSpacing: 1,
      textTransform: "uppercase",
      color: colors.label2,
    },
    batchRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    batchHint: { marginTop: 10, fontSize: 13, fontFamily: font.regular, lineHeight: 19, color: colors.label2 },

    card: { borderRadius: radius.md, backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.sep, paddingHorizontal: 14 },
    ingredientRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.sep,
    },
    ingredientText: { flex: 1, minWidth: 0, gap: 2 },
    ingredientName: { fontSize: 15, fontFamily: font.medium, color: colors.label },
    ingredientNote: { fontSize: 12.5, fontFamily: font.regular, color: colors.label3 },
    ingredientGrams: { fontSize: 16, fontFamily: font.bold, color: colors.label, fontVariant: ["tabular-nums"] },

    steps: { gap: 14 },
    stepRow: { flexDirection: "row", gap: 12 },
    stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center", marginTop: 1 },
    stepNumText: { fontSize: 12, fontFamily: font.bold, color: colors.label2 },
    stepText: { flex: 1, minWidth: 0, fontSize: 14.5, fontFamily: font.regular, lineHeight: 21, color: colors.label },

    why: { fontSize: 14.5, fontFamily: font.regular, lineHeight: 22, color: colors.label2 },

    warning: {
      marginTop: 26,
      padding: 16,
      borderRadius: radius.lg,
      backgroundColor: colors.orangeSoft,
      borderWidth: 1,
      borderColor: withAlpha(colors.orange, 0.3),
      gap: 8,
    },
    warningHead: { flexDirection: "row", alignItems: "center", gap: 8 },
    warningTitle: { flex: 1, minWidth: 0, fontSize: 15, fontFamily: font.bold, color: colors.label },
    warningBody: { fontSize: 13.5, fontFamily: font.regular, lineHeight: 20, color: colors.label2 },

    done: { marginTop: 22, height: 50, borderRadius: radius.lg, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
    doneLabel: { fontSize: 17, fontFamily: font.semibold, color: colors.label },
  });
