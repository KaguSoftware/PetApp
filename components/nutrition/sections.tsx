import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Icon, type IconName } from "@/components/Icons";
import { PressableScale } from "@/components/ui";
import CostEngine from "@/components/nutrition/CostEngine";
import RecipeSheet from "@/components/nutrition/RecipeSheet";
import { AnimatedNumber, Hairline, RangeBar, Reveal, TonePill, useInk } from "@/components/nutrition/atoms";
import type { Pet } from "@/lib/data";
import {
  DRY_MATTER_NOTE,
  FIT_LABEL,
  FIT_MEANING,
  FORMAT_ICON,
  FORMAT_LABEL,
  MACRO_AXIS_MAX,
  MACRO_LABEL,
  NEVER_FEED,
  energyBasis,
  fillCopy,
  formatsFor,
  gramsForDensity,
  nutritionFor,
  portionGrams,
  recipesFor,
  type Fit,
  type IngredientRule,
  type MacroKey,
  type Recipe,
  type SectionId,
} from "@/lib/nutrition";
import { cardShadow, font, radius, useColors, withAlpha, type Colors } from "@/lib/theme";

/**
 * The four content sections behind the Nutrition hub, plus the shared bits they
 * lean on.
 *
 * Each one is a whole pushed screen rather than a block on a single scroll: the
 * first build put targets, formats, ingredients, recipes and cost end to end and
 * it read as a wall. One screen answers one question, and the hub decides which
 * question you're asking.
 *
 * The fifth section, cost, is `CostEngine` and lives in its own file.
 */

const MACRO_ORDER: MacroKey[] = ["protein", "fat", "fibre"];

const FIT_TONE: Record<Fit, "green" | "accent" | "orange" | "red"> = {
  best: "green",
  good: "accent",
  sometimes: "orange",
  avoid: "red",
};

const FIT_ICON: Record<Fit, IconName> = { best: "check", good: "check", sometimes: "alert", avoid: "xmark" };

/** Section heading + one line of orientation, repeated at the top of each screen. */
export function SectionIntro({ title, body }: { title: string; body: string }) {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={s.intro}>
      <Text style={s.introTitle}>{title}</Text>
      <Text style={s.introBody}>{body}</Text>
    </View>
  );
}

/* ── 1. Daily targets ──────────────────────────────────────────────────────── */

export function TargetsSection({ pet }: { pet: Pet }) {
  const colors = useColors();
  const ink = useInk();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const profile = useMemo(() => nutritionFor(pet), [pet]);
  const basis = useMemo(() => energyBasis(pet), [pet]);
  const formats = useMemo(() => formatsFor(pet), [pet]);
  const [dryMatterOpen, setDryMatterOpen] = useState(false);

  const headlineFormat = formats[0]?.id ?? "dry";
  const headlineGrams = portionGrams(pet, headlineFormat);

  return (
    <>
      <SectionIntro
        title="Daily targets"
        body={`Everything below is worked out from ${pet.name}'s own age, sex and weight, so it moves as they do.`}
      />

      <Reveal>
        <View style={[s.spec, { backgroundColor: ink.bg, borderColor: ink.border }]}>
          <View style={s.specFigures}>
            <View style={s.specFigure}>
              <AnimatedNumber
                value={basis.kcal}
                decimals={0}
                style={[s.specValue, { color: ink.fg }]}
                accessibilityLabel={`${basis.kcal} kilocalories a day`}
              />
              <Text style={[s.specUnit, { color: ink.fgFaint }]}>kcal / day</Text>
            </View>
            <View style={[s.specDivider, { backgroundColor: ink.hairline }]} />
            <View style={s.specFigure}>
              <AnimatedNumber
                value={headlineGrams}
                decimals={0}
                style={[s.specValue, { color: ink.fg }]}
                accessibilityLabel={`${headlineGrams} grams of ${FORMAT_LABEL[headlineFormat]} a day`}
              />
              <Text style={[s.specUnit, { color: ink.fgFaint }]}>g {FORMAT_LABEL[headlineFormat].toLowerCase()}</Text>
            </View>
          </View>

          <Text style={[s.specBasis, { color: ink.fgDim }]}>{basis.label}</Text>

          {/* When the recommended format isn't kibble the gram figure is several
              times larger than the one the Plan tab prints, because wet food is
              mostly water. Saying so stops the two screens reading as a
              contradiction. */}
          {headlineFormat !== "dry" ? (
            <Text style={[s.specCompare, { color: ink.fgFaint }]}>
              {FORMAT_LABEL[headlineFormat]} is mostly water, so it weighs more for the same energy. The same day on dry kibble
              would be about {portionGrams(pet, "dry")} g.
            </Text>
          ) : null}

          <View style={s.specSpacer} />
          <Hairline color={ink.hairline} />

          {/* Meal shape. Not a number, but for the deep-chested breeds it changes
              outcomes more than the numbers do. */}
          <View style={s.mealRow}>
            <View style={[s.mealIcon, { backgroundColor: ink.track }]}>
              <Icon name="clock" size={16} color={ink.fg} strokeWidth={2.2} />
            </View>
            <View style={s.mealText}>
              <Text style={[s.mealPattern, { color: ink.fg }]}>{profile.mealPattern}</Text>
              <Text style={[s.mealWhy, { color: ink.fgDim }]}>{profile.mealWhy}</Text>
            </View>
          </View>
        </View>
      </Reveal>

      <Text style={s.blockTitle}>The split</Text>
      <Text style={s.blockHint}>
        What a {pet.breed} diet should be made of. All three bars share one scale, so their lengths can be compared directly.
      </Text>
      <View style={s.macroCard}>
        {MACRO_ORDER.map((key, i) => {
          const target = profile.macros[key];
          const tint = key === "protein" ? colors.accent : key === "fat" ? colors.orange : colors.green;
          return (
            <View key={key} style={s.macroRow}>
              <View style={s.macroHead}>
                <Text style={s.macroLabel}>{MACRO_LABEL[key]}</Text>
                <Text style={s.macroValue}>
                  {target.min}–{target.max}%
                </Text>
              </View>
              <RangeBar min={target.min} max={target.max} scale={MACRO_AXIS_MAX} tint={tint} track={colors.fill} delay={80 + i * 90} />
            </View>
          );
        })}
        <View style={s.macroAxis}>
          <Text style={s.macroAxisLabel}>0%</Text>
          <Text style={s.macroAxisLabel}>{MACRO_AXIS_MAX}% of dry matter</Text>
        </View>
      </View>

      <PressableScale
        onPress={() => setDryMatterOpen((v) => !v)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityState={{ expanded: dryMatterOpen }}
      >
        <View style={s.inlineToggle}>
          <Icon name={dryMatterOpen ? "chevron-down" : "chevron-right"} size={14} color={colors.accent} strokeWidth={2.4} />
          <Text style={s.inlineToggleLabel}>What &ldquo;% dry matter&rdquo; means</Text>
        </View>
      </PressableScale>
      {dryMatterOpen ? <Text style={s.inlineBody}>{DRY_MATTER_NOTE}</Text> : null}
    </>
  );
}

/* ── 2. Best food ──────────────────────────────────────────────────────────── */

export function FoodSection({ pet }: { pet: Pet }) {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const profile = useMemo(() => nutritionFor(pet), [pet]);
  const formats = useMemo(() => formatsFor(pet), [pet]);
  const [open, setOpen] = useState<string | null>(formats[0]?.id ?? null);

  return (
    <>
      <SectionIntro
        title={`Best food for a ${pet.breed}`}
        body="Ranked best to worst for this breed. Tap any one for the reasoning."
      />

      <View style={s.formats}>
        {formats.map((f, i) => {
          const isOpen = open === f.id;
          const tone = FIT_TONE[f.fit];
          const tint = tone === "green" ? colors.green : tone === "accent" ? colors.accent : tone === "orange" ? colors.orange : colors.red;
          const bg = tone === "green" ? colors.greenSoft : tone === "accent" ? colors.accentSoft : tone === "orange" ? colors.orangeSoft : colors.redSoft;
          return (
            <PressableScale
              key={f.id}
              onPress={() => setOpen(isOpen ? null : f.id)}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              accessibilityLabel={`${FORMAT_LABEL[f.id]}, ${FIT_MEANING[f.fit]}`}
            >
              <View style={[s.formatRow, i === 0 && s.formatRowTop, isOpen && { backgroundColor: colors.fill }]}>
                <View style={s.formatHead}>
                  {/* Rank number rather than another icon circle — position in
                      the list is the information here. */}
                  <Text style={[s.formatRank, i === 0 && { color: colors.green }]}>{i + 1}</Text>
                  <Icon name={FORMAT_ICON[f.id]} size={17} color={colors.label2} strokeWidth={2.1} />
                  <Text style={s.formatName} numberOfLines={1}>
                    {FORMAT_LABEL[f.id]}
                  </Text>
                  <TonePill icon={FIT_ICON[f.fit]} label={FIT_LABEL[f.fit]} tint={tint} bg={bg} />
                  <Icon name={isOpen ? "chevron-down" : "chevron-right"} size={14} color={colors.label3} strokeWidth={2.2} />
                </View>
                {isOpen ? <Text style={s.formatNote}>{f.note}</Text> : null}
              </View>
            </PressableScale>
          );
        })}
      </View>

      <Text style={s.blockTitle}>What to look for on the label</Text>
      <Text style={s.blockHint}>The handful of things worth checking before you buy.</Text>
      <View style={s.nutrients}>
        {profile.nutrients.map((n, i) => (
          <View key={n.label} style={[s.nutrientRow, i === profile.nutrients.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={s.nutrientIcon}>
              <Icon name={n.icon} size={17} color={colors.accent} strokeWidth={2.2} />
            </View>
            <View style={s.nutrientText}>
              <Text style={s.nutrientLabel}>{n.label}</Text>
              <Text style={s.nutrientWhy}>{n.why}</Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

/* ── 3. What goes in the bowl ──────────────────────────────────────────────── */

export function BowlSection({ pet }: { pet: Pet }) {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const profile = useMemo(() => nutritionFor(pet), [pet]);

  return (
    <>
      <SectionIntro
        title="What goes in the bowl"
        body={`Breed-specific first, then the list that applies to every ${pet.species} regardless of breed.`}
      />

      <View style={s.bands}>
        <RuleBand colors={colors} tone="green" icon="check" title="Go out of your way for" rules={profile.favour} />
        <RuleBand colors={colors} tone="orange" icon="alert" title={`Keep low for a ${pet.breed}`} rules={profile.limit} />
        {/* Never collapsed and never truncated: this is a safety notice, and the
            person reading it is often already worried. */}
        <RuleBand
          colors={colors}
          tone="red"
          icon="xmark"
          title={`Never, for any ${pet.species}`}
          rules={NEVER_FEED[pet.species]}
        />
      </View>

      <View style={s.emergency}>
        <Icon name="cross" size={16} color={colors.red} strokeWidth={2.4} />
        <Text style={s.emergencyText}>
          If any of the red list has been eaten, ring a vet straight away rather than waiting for symptoms. With most of them
          the window for treatment closes before the animal looks unwell.
        </Text>
      </View>
    </>
  );
}

/* ── 4. Recipes ────────────────────────────────────────────────────────────── */

export function RecipesSection({ pet }: { pet: Pet }) {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const basis = useMemo(() => energyBasis(pet), [pet]);
  const recipes = useMemo(() => recipesFor(pet), [pet]);
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  return (
    <>
      <SectionIntro
        title="Cook it yourself"
        body={`Each one is portioned from ${pet.name}'s own calorie needs, not a generic cup measure. Tap for ingredients and method.`}
      />

      <View style={s.recipeWarn}>
        <Icon name="alert" size={15} color={colors.orange} strokeWidth={2.4} />
        <Text style={s.recipeWarnText}>
          Home-cooked food is not complete on its own. Every one of these needs a vet-formulated supplement to fill the
          calcium, taurine and vitamin gaps, and that is not optional.
        </Text>
      </View>

      <View style={s.recipeList}>
        {recipes.map((r) => {
          const grams = gramsForDensity(basis.kcal, r.kcalPer100g);
          return (
            <PressableScale
              key={r.id}
              haptic
              onPress={() => setRecipe(r)}
              accessibilityRole="button"
              accessibilityLabel={`${r.name}. ${r.suits}. ${grams} grams a day for ${pet.name}.`}
            >
              <View style={s.recipeRow}>
                <View style={s.recipeText}>
                  <Text style={s.recipeSuits}>{r.suits}</Text>
                  <Text style={s.recipeName}>{r.name}</Text>
                  <View style={s.recipeTags}>
                    {r.tags.map((t) => (
                      <View key={t} style={s.recipeTag}>
                        <Text style={s.recipeTagLabel}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={s.recipePortion}>
                  <Text style={s.recipeGrams}>{grams.toLocaleString()}</Text>
                  <Text style={s.recipeGramsUnit}>g / day</Text>
                  <View style={s.recipeMeta}>
                    <Icon name="clock" size={11} color={colors.label3} strokeWidth={2.2} />
                    <Text style={s.recipeMetaText}>{r.minutes}m</Text>
                  </View>
                </View>
              </View>
            </PressableScale>
          );
        })}
      </View>

      <RecipeSheet pet={pet} recipe={recipe} open={recipe != null} onClose={() => setRecipe(null)} />
    </>
  );
}

/* ── 5. Cost ───────────────────────────────────────────────────────────────── */

export function CostSection({ pet }: { pet: Pet }) {
  return <CostEngine pet={pet} />;
}

/** Renders whichever section the route asked for. */
export function NutritionSectionBody({ id, pet }: { id: SectionId; pet: Pet }) {
  switch (id) {
    case "targets":
      return <TargetsSection pet={pet} />;
    case "food":
      return <FoodSection pet={pet} />;
    case "bowl":
      return <BowlSection pet={pet} />;
    case "recipes":
      return <RecipesSection pet={pet} />;
    case "cost":
      return <CostSection pet={pet} />;
  }
}

/* ── Rule band ─────────────────────────────────────────────────────────────── */

/**
 * One tone-coded band of the plate rules.
 *
 * A tint across the whole container plus a matching header, rather than the
 * coloured left-edge stripe this pattern usually attracts: a stripe reads as
 * decoration and gets lost at a glance, and the entire point of the red band is
 * that it cannot be mistaken for the amber one.
 */
function RuleBand({
  colors,
  tone,
  icon,
  title,
  rules,
}: {
  colors: Colors;
  tone: "green" | "orange" | "red";
  icon: IconName;
  title: string;
  rules: IngredientRule[];
}) {
  const s = useMemo(() => makeStyles(colors), [colors]);
  const tint = tone === "green" ? colors.green : tone === "orange" ? colors.orange : colors.red;
  const bg = tone === "green" ? colors.greenSoft : tone === "orange" ? colors.orangeSoft : colors.redSoft;
  if (rules.length === 0) return null;
  return (
    <View style={[s.band, { backgroundColor: bg, borderColor: withAlpha(tint, 0.28) }]}>
      <View style={s.bandHead}>
        <View style={[s.bandIcon, { backgroundColor: tint }]}>
          <Icon name={icon} size={12} color={colors.white} strokeWidth={3} />
        </View>
        <Text style={[s.bandTitle, { color: tint }]}>{title}</Text>
      </View>
      <View style={s.bandRules}>
        {rules.map((r) => (
          <View key={r.item} style={s.bandRule}>
            <Text style={s.bandItem}>{r.item}</Text>
            <Text style={s.bandWhy}>{r.why}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ── Footer ────────────────────────────────────────────────────────────────── */

export function VetDisclaimer({ pet }: { pet: Pet }) {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={s.disclaimer}>
      <Text style={s.disclaimerText}>
        {fillCopy(
          "General guidance built from breed-typical needs and {name}'s own age and weight. It is not a diagnosis and does not replace your vet, who is the one to ask before changing the diet of an animal that is unwell, pregnant, very young, or on medication.",
          pet,
        )}
      </Text>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    /* Intro */
    intro: { paddingHorizontal: 4, paddingBottom: 20 },
    introTitle: { fontSize: 27, lineHeight: 32, fontFamily: font.bold, letterSpacing: -0.8, color: colors.label },
    introBody: { marginTop: 9, fontSize: 14.5, lineHeight: 22, fontFamily: font.regular, color: colors.label2, maxWidth: 560 },

    /* Spec panel */
    spec: { borderRadius: radius.xl, borderWidth: 1, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 4, overflow: "hidden" },
    specFigures: { flexDirection: "row", alignItems: "stretch", marginBottom: 8 },
    specFigure: { flex: 1, minWidth: 0 },
    specDivider: { width: StyleSheet.hairlineWidth, marginHorizontal: 18 },
    specValue: { fontSize: 40, lineHeight: 46, fontFamily: font.bold, letterSpacing: -1.4, fontVariant: ["tabular-nums"] },
    specUnit: { marginTop: 2, fontSize: 11.5, fontFamily: font.bold, letterSpacing: 0.7, textTransform: "uppercase" },
    specBasis: { fontSize: 12.5, lineHeight: 18, fontFamily: font.regular },
    specCompare: { marginTop: 7, fontSize: 12, lineHeight: 17, fontFamily: font.regular },
    specSpacer: { height: 16 },
    mealRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16 },
    mealIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
    mealText: { flex: 1, minWidth: 0, gap: 3 },
    mealPattern: { fontSize: 15.5, fontFamily: font.semibold, letterSpacing: -0.1 },
    mealWhy: { fontSize: 12.5, lineHeight: 18, fontFamily: font.regular },

    /* Shared block heading inside a section */
    blockTitle: { marginTop: 32, paddingHorizontal: 4, fontSize: 19, fontFamily: font.bold, letterSpacing: -0.4, color: colors.label },
    blockHint: { marginTop: 6, marginBottom: 14, paddingHorizontal: 4, fontSize: 13.5, lineHeight: 20, fontFamily: font.regular, color: colors.label2 },

    /* Macros */
    macroCard: {
      borderRadius: radius.lg,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.sep,
      paddingHorizontal: 16,
      paddingVertical: 18,
      gap: 16,
      ...cardShadow,
    },
    macroRow: { gap: 7 },
    macroHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10 },
    macroLabel: { fontSize: 13.5, fontFamily: font.semibold, color: colors.label2 },
    macroValue: { fontSize: 15, fontFamily: font.bold, color: colors.label, fontVariant: ["tabular-nums"] },
    macroAxis: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: -4 },
    macroAxisLabel: { fontSize: 10.5, fontFamily: font.medium, letterSpacing: 0.3, color: colors.label3 },

    inlineToggle: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40, paddingHorizontal: 4 },
    inlineToggleLabel: { fontSize: 13.5, fontFamily: font.semibold, color: colors.accent },
    inlineBody: { paddingHorizontal: 4, fontSize: 13, lineHeight: 20, fontFamily: font.regular, color: colors.label2 },

    /* Formats */
    formats: {
      borderRadius: radius.lg,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.sep,
      overflow: "hidden",
      ...cardShadow,
    },
    formatRow: { paddingHorizontal: 14, paddingVertical: 13, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.sep },
    formatRowTop: { borderTopWidth: 0 },
    formatHead: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 32 },
    formatRank: { width: 16, fontSize: 13, fontFamily: font.bold, color: colors.label3, fontVariant: ["tabular-nums"] },
    formatName: { flex: 1, minWidth: 0, fontSize: 15, fontFamily: font.semibold, color: colors.label },
    formatNote: { marginTop: 9, marginLeft: 26, fontSize: 13.5, lineHeight: 20, fontFamily: font.regular, color: colors.label2 },

    /* Nutrients */
    nutrients: {
      borderRadius: radius.lg,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.sep,
      paddingHorizontal: 16,
      ...cardShadow,
    },
    nutrientRow: { flexDirection: "row", gap: 13, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.sep },
    nutrientIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
    nutrientText: { flex: 1, minWidth: 0, gap: 3, paddingTop: 2 },
    nutrientLabel: { fontSize: 15, fontFamily: font.semibold, color: colors.label },
    nutrientWhy: { fontSize: 13, lineHeight: 19, fontFamily: font.regular, color: colors.label2 },

    /* Rule bands */
    bands: { gap: 12 },
    band: { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 },
    bandHead: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 12 },
    bandIcon: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    bandTitle: { flex: 1, minWidth: 0, fontSize: 13, fontFamily: font.bold, letterSpacing: 0.5, textTransform: "uppercase" },
    bandRules: { gap: 14 },
    bandRule: { gap: 3 },
    bandItem: { fontSize: 15, fontFamily: font.semibold, color: colors.label },
    bandWhy: { fontSize: 13, lineHeight: 19, fontFamily: font.regular, color: colors.label2 },
    emergency: { marginTop: 16, flexDirection: "row", gap: 10, paddingHorizontal: 4 },
    emergencyText: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 19, fontFamily: font.medium, color: colors.label2 },

    /* Recipes */
    recipeWarn: {
      flexDirection: "row",
      gap: 10,
      padding: 14,
      borderRadius: radius.md,
      backgroundColor: colors.orangeSoft,
      borderWidth: 1,
      borderColor: withAlpha(colors.orange, 0.28),
      marginBottom: 16,
    },
    recipeWarnText: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 19, fontFamily: font.regular, color: colors.label2 },
    recipeList: { gap: 10 },
    recipeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      padding: 16,
      borderRadius: radius.lg,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.sep,
      ...cardShadow,
    },
    recipeText: { flex: 1, minWidth: 0 },
    recipeSuits: { fontSize: 11, fontFamily: font.bold, letterSpacing: 0.6, textTransform: "uppercase", color: colors.accent },
    recipeName: { marginTop: 4, fontSize: 18, lineHeight: 23, fontFamily: font.bold, letterSpacing: -0.4, color: colors.label },
    recipeTags: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 9 },
    recipeTag: { borderRadius: radius.full, backgroundColor: colors.fill, paddingHorizontal: 8, paddingVertical: 3 },
    recipeTagLabel: { fontSize: 10.5, fontFamily: font.semibold, color: colors.label2 },
    recipePortion: { alignItems: "flex-end", flexShrink: 0 },
    recipeGrams: { fontSize: 24, fontFamily: font.bold, letterSpacing: -0.6, color: colors.label, fontVariant: ["tabular-nums"] },
    recipeGramsUnit: { fontSize: 11, fontFamily: font.semibold, color: colors.label3 },
    recipeMeta: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 7 },
    recipeMetaText: { fontSize: 11, fontFamily: font.medium, color: colors.label3 },

    /* Footer */
    disclaimer: { marginTop: 34, paddingHorizontal: 4, paddingTop: 18, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.sep },
    disclaimerText: { fontSize: 12.5, lineHeight: 19, fontFamily: font.regular, color: colors.label3 },
  });
