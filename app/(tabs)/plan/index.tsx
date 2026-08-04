import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import EmptyState from "@/components/EmptyState";
import HeaderActions from "@/components/HeaderActions";
import PageLoading from "@/components/PageLoading";
import Paywall from "@/components/Paywall";
import PetAvatar from "@/components/PetAvatar";
import { PetChoiceRow } from "@/components/PetChoice";
import { TabScreen } from "@/components/Screen";
import BoardTile, { TileFigure, TileGlyph } from "@/components/plan/BoardTile";
import { Icon } from "@/components/Icons";
import { PressableScale } from "@/components/ui";
import { useReduceMotion } from "@/lib/a11y";
import { sinceLabel } from "@/lib/careDashboard";
import { medicationSummary } from "@/lib/careStatus";
import { CARE_PLANS, type Pet } from "@/lib/data";
import { GUIDES } from "@/lib/guides";
import { energyBasis } from "@/lib/nutrition";
import { useStore } from "@/lib/store";
import { font, lightColors, radius, useColors, withAlpha, type Colors } from "@/lib/theme";
import { usePullToRefresh } from "@/lib/useRefresh";

/** The two things on the board that are about one animal rather than the house. */
type PetScope = "plan" | "nutrition";

const SCOPE_QUESTION: Record<PetScope, string> = {
  plan: "Whose plan?",
  nutrition: "Whose food?",
};

/** What PetPal+ actually buys, three lines, no sentence longer than a glance. */
const LOCKED_LINES = ["Exact portions in grams", "Grooming and nail cadence", "Vaccines and vet schedule"];

/**
 * Care — a board, not a document.
 *
 * The old page was a per-pet reference manual behind a picker at the top: pick
 * Milo, scroll past nutrition, guides, links, today's checklist, a feeding
 * table and a three-level accordion; pick Luna, scroll it all again. Two things
 * changed.
 *
 * The picker is gone. It was a mode — a hidden "currently viewing Milo" you had
 * to hold in your head — and every tile that genuinely needs a pet now asks for
 * one at the moment it needs it, with faces rather than a list of names. A
 * household of one is never asked at all.
 *
 * And the manual moved. What is left here is six panels, ranked by size and
 * separated by hue, each one entirely a button; the long-form plan lives on
 * `/plan/[petId]`, where the pet is in the URL instead of in your memory.
 */
export default function CarePage() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { state, hydrated } = useStore();
  const refreshControl = usePullToRefresh();
  const reduceMotion = useReduceMotion();

  const [asking, setAsking] = useState<PetScope | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const pets = state.pets;
  const now = Date.now();

  const vetBuilt = useMemo(() => pets.filter((p) => CARE_PLANS[p.breed]).length, [pets]);
  const kcal = useMemo(() => pets.reduce((sum, p) => sum + energyBasis(p).kcal, 0), [pets]);

  const meds = useMemo(() => {
    let count = 0;
    let due = 0;
    for (const p of pets) {
      const s = medicationSummary(p, state.schedules, state.activities, now);
      count += s.count;
      due += s.due;
    }
    return { count, due };
    // `now` is deliberately not a dep: this page has no ticker, so re-running
    // the whole med state machine on it would buy nothing. The counts refresh
    // whenever the data behind them does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pets, state.schedules, state.activities]);

  const reminders = useMemo(() => {
    const open = state.reminders.filter((r) => !r.done);
    return { open: open.length, overdue: open.filter((r) => r.due < now).length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.reminders]);

  const lastVet = useMemo(() => {
    let ts = 0;
    for (const p of pets) for (const v of p.vetVisits) ts = Math.max(ts, v.ts);
    for (const a of state.activities) if (a.type === "vet") ts = Math.max(ts, a.ts);
    return ts || undefined;
  }, [pets, state.activities]);

  if (!hydrated) {
    return (
      <TabScreen title="Care" trailing={<HeaderActions />} refreshControl={refreshControl}>
        <PageLoading />
      </TabScreen>
    );
  }

  if (pets.length === 0) {
    return (
      <TabScreen title="Care" trailing={<HeaderActions />} refreshControl={refreshControl}>
        <View style={{ marginTop: 16 }}>
          <EmptyState
            icon="heart-text"
            title="No pets yet"
            body="Add a pet and its plan, portions and routine show up here."
            cta="Add a pet"
            onCta={() => router.push("/pet/new")}
          />
        </View>
      </TabScreen>
    );
  }

  const open = (scope: PetScope, petId: string) => {
    setAsking(null);
    if (scope === "plan") router.push(`/plan/${petId}`);
    else router.push({ pathname: "/nutrition", params: { petId } });
  };

  /** One pet in play means there is no question to ask — the common case. */
  const start = (scope: PetScope) => {
    if (asking === scope) {
      setAsking(null);
      return;
    }
    if (pets.length === 1) {
      open(scope, pets[0].id);
      return;
    }
    setAsking(scope);
  };

  const captionFor = (pet: Pet) =>
    asking === "plan" ? (CARE_PLANS[pet.breed] ? "Vet-built" : "Your targets") : `${energyBasis(pet).kcal.toLocaleString()} kcal`;

  const askPanel = (scope: PetScope, tint: string) =>
    asking === scope ? (
      <Animated.View
        style={[styles.ask, { borderColor: withAlpha(tint, 0.4) }]}
        entering={reduceMotion ? undefined : FadeIn.duration(160)}
        exiting={reduceMotion ? undefined : FadeOut.duration(120)}
      >
        <Text style={styles.askTitle}>{SCOPE_QUESTION[scope]}</Text>
        <PetChoiceRow pets={pets} onPress={(petId) => open(scope, petId)} captionFor={captionFor} />
      </Animated.View>
    ) : null;

  const solo = pets.length === 1 ? pets[0] : undefined;

  return (
    <TabScreen title="Care" trailing={<HeaderActions />} refreshControl={refreshControl}>
      <View style={styles.board}>
        {state.premium ? (
          <BoardTile
            tint={colors.accent}
            wash={colors.accentSoft}
            minHeight={176}
            label={solo ? `${solo.name}'s plan` : "Care plans"}
            caption={
              solo
                ? CARE_PLANS[solo.breed]
                  ? `Vet-built · ${solo.breed}`
                  : "Your own targets"
                : vetBuilt === pets.length
                  ? `${pets.length} vet-built plans`
                  : vetBuilt === 0
                    ? `${pets.length} custom plans`
                    : `${vetBuilt} vet-built · ${pets.length - vetBuilt} custom`
            }
            onPress={() => start("plan")}
            accessibilityLabel={solo ? `${solo.name}'s care plan` : "Care plans"}
            accessibilityHint={solo ? undefined : "Choose a pet"}
          >
            <View style={styles.faces}>
              {pets.slice(0, 5).map((p) => (
                <View key={p.id} style={styles.face}>
                  <PetAvatar pet={p} size={solo ? "lg" : "sm"} />
                  {CARE_PLANS[p.breed] ? (
                    <View style={styles.vetBadge}>
                      <Icon name="check" size={9} color={colors.white} strokeWidth={3.2} />
                    </View>
                  ) : null}
                </View>
              ))}
              {pets.length > 5 ? <Text style={styles.moreFaces}>+{pets.length - 5}</Text> : null}
            </View>
          </BoardTile>
        ) : (
          <LockedPlanHero onPress={() => setPaywallOpen(true)} />
        )}

        {askPanel("plan", colors.accent)}

        <View style={styles.row}>
          <BoardTile
            tint={colors.green}
            wash={colors.greenSoft}
            minHeight={138}
            flex={7}
            label="Nutrition"
            caption={solo ? `${solo.name}'s daily energy` : `Across ${pets.length} pets`}
            onPress={() => start("nutrition")}
            accessibilityLabel={`Nutrition, ${kcal.toLocaleString()} kilocalories a day`}
            accessibilityHint={solo ? undefined : "Choose a pet"}
          >
            <TileFigure value={kcal.toLocaleString()} unit="kcal/day" tint={colors.green} />
          </BoardTile>

          <BoardTile
            tint={colors.red}
            wash={colors.redSoft}
            minHeight={138}
            flex={5}
            label="Medication"
            caption={meds.count === 0 ? "None tracked" : meds.due > 0 ? `${meds.due} due now` : "All up to date"}
            captionTint={meds.due > 0 ? colors.red : undefined}
            onPress={() => router.push("/medications")}
            accessibilityLabel={`Medication, ${meds.count === 0 ? "none tracked" : `${meds.count} tracked`}`}
          >
            {meds.count === 0 ? (
              <TileGlyph icon="pill" tint={colors.red} />
            ) : (
              <TileFigure value={String(meds.count)} unit={meds.count === 1 ? "med" : "meds"} tint={colors.red} />
            )}
          </BoardTile>
        </View>

        {askPanel("nutrition", colors.green)}

        <View style={styles.row}>
          <BoardTile
            tint={colors.orange}
            wash={colors.orangeSoft}
            minHeight={120}
            flex={5}
            label="Reminders"
            caption={reminders.overdue > 0 ? `${reminders.overdue} overdue` : reminders.open > 0 ? "Coming up" : "Nothing set"}
            captionTint={reminders.overdue > 0 ? colors.red : undefined}
            corner={{
              icon: "plus",
              onPress: () => router.push({ pathname: "/reminders", params: { new: "1" } }),
              accessibilityLabel: "New reminder",
            }}
            onPress={() => router.push("/reminders")}
            accessibilityLabel={`Reminders, ${reminders.open} open`}
          >
            {reminders.open === 0 ? (
              <TileGlyph icon="bell" tint={colors.orange} />
            ) : (
              <TileFigure value={String(reminders.open)} unit="open" tint={colors.orange} />
            )}
          </BoardTile>

          <BoardTile
            tint={colors.vetTint}
            wash={colors.vetBg}
            minHeight={120}
            flex={7}
            label="Find a vet"
            caption={lastVet ? `Last visit ${sinceLabel(lastVet, now)}` : "No visits logged"}
            onPress={() => router.push("/vets")}
            accessibilityLabel="Find a vet"
          >
            <TileGlyph icon="cross" tint={colors.vetTint} />
          </BoardTile>
        </View>
      </View>

      <PressableScale onPress={() => router.push("/instructions")} accessibilityRole="button" accessibilityLabel="All guides">
        <View style={styles.railHead}>
          <Text style={styles.railTitle}>Guides</Text>
          <View style={styles.seeAll}>
            <Text style={styles.seeAllText}>See all</Text>
            <Icon name="chevron-right" size={14} color={colors.accent} />
          </View>
        </View>
      </PressableScale>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {GUIDES.map((g) => (
          <PressableScale
            key={g.id}
            haptic
            onPress={() => router.push(`/instructions/${g.id}`)}
            accessibilityRole="button"
            accessibilityLabel={g.title}
          >
            <View style={[styles.guide, { borderColor: withAlpha(g.tint, 0.22) }]}>
              {/* The guide tints are fixed light-ramp colours, so the wash is
                  composited over the card surface rather than straight onto the
                  page — that keeps the glyph's ground light enough to read it
                  against in dark mode too. */}
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: g.bg }]} />
              <Icon name={g.icon} size={24} color={g.tint} strokeWidth={1.9} />
              <Text numberOfLines={2} style={styles.guideLabel}>
                {g.title}
              </Text>
              <Text style={styles.guideMinutes}>{g.minutes} min</Text>
            </View>
          </PressableScale>
        ))}
      </ScrollView>

      <Paywall open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </TabScreen>
  );
}

/**
 * The plan tile when PetPal+ is off. It keeps the hero's position and gains
 * height rather than becoming a wall across the page: everything else on the
 * board — nutrition, medication, reminders, the vet, the guides — is free, and
 * burying free features behind an upsell would be the worse trade.
 *
 * Filled from the LIGHT accent ramp in both themes: dark mode's accent is a
 * pale lavender tuned for text on a dark page, and white type on a panel of it
 * lands near 2:1. The light ramp's deeper violet clears 5:1 either way.
 */
function LockedPlanHero({ onPress }: { onPress: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <PressableScale haptic onPress={onPress} accessibilityRole="button" accessibilityLabel="Unlock the vet-built plan with PetPal+">
      <LinearGradient
        colors={[lightColors.accent, lightColors.accentDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.locked}
      >
        <View style={styles.lockedTop}>
          <View style={styles.lockDisc}>
            <Icon name="lock" size={17} color={colors.white} strokeWidth={2.1} />
          </View>
          <Text style={styles.lockedKicker}>PETPAL+</Text>
        </View>

        <Text style={styles.lockedTitle}>The vet-built plan</Text>

        <View style={styles.lockedLines}>
          {LOCKED_LINES.map((line) => (
            <View key={line} style={styles.lockedLine}>
              <Icon name="check" size={13} color={colors.white} strokeWidth={2.6} />
              <Text style={styles.lockedLineText}>{line}</Text>
            </View>
          ))}
        </View>

        <View style={styles.unlock}>
          <Text style={styles.unlockLabel}>Unlock</Text>
          <Icon name="chevron-right" size={15} color={lightColors.accentDeep} strokeWidth={2.4} />
        </View>
      </LinearGradient>
    </PressableScale>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    board: { marginTop: 12, gap: 10 },
    row: { flexDirection: "row", gap: 10, alignItems: "stretch" },

    faces: { flexDirection: "row", alignItems: "center", gap: 8 },
    face: { paddingRight: 2 },
    vetBadge: {
      position: "absolute",
      right: 0,
      bottom: 0,
      width: 16,
      height: 16,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
      borderWidth: 2,
      borderColor: colors.bg,
    },
    moreFaces: { fontSize: 14, fontFamily: font.semibold, color: colors.label2 },

    // The pet step, opened by the tile that asked. Deliberately not a sheet: a
    // modal would cover the board you are acting on, and the answer is one tap.
    ask: {
      borderRadius: radius.lg,
      borderWidth: 1,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 12,
    },
    askTitle: { marginBottom: 8, paddingHorizontal: 4, fontSize: 15, fontFamily: font.semibold, color: colors.label },

    locked: { borderRadius: radius.lg, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 18 },
    lockedTop: { flexDirection: "row", alignItems: "center", gap: 10 },
    lockDisc: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255, 255, 255, 0.2)",
    },
    lockedKicker: { fontSize: 11.5, fontFamily: font.bold, letterSpacing: 1.4, color: "rgba(255, 255, 255, 0.82)" },
    lockedTitle: { marginTop: 16, fontSize: 26, fontFamily: font.bold, letterSpacing: -0.6, color: colors.white },
    lockedLines: { marginTop: 14, gap: 7 },
    lockedLine: { flexDirection: "row", alignItems: "center", gap: 8 },
    lockedLineText: { fontSize: 14, fontFamily: font.medium, color: "rgba(255, 255, 255, 0.92)" },
    unlock: {
      marginTop: 20,
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      minHeight: 40,
      paddingLeft: 20,
      paddingRight: 14,
      borderRadius: radius.full,
      backgroundColor: colors.white,
      justifyContent: "center",
    },
    unlockLabel: { fontSize: 15, fontFamily: font.semibold, color: lightColors.accentDeep },

    railHead: { marginTop: 26, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, minHeight: 32 },
    railTitle: { fontSize: 17, fontFamily: font.bold, letterSpacing: -0.25, color: colors.label },
    seeAll: { flexDirection: "row", alignItems: "center", gap: 2 },
    seeAllText: { fontSize: 14, fontFamily: font.semibold, color: colors.accent },
    rail: { gap: 10, paddingHorizontal: 4, paddingTop: 12, paddingBottom: 4 },
    guide: {
      width: 116,
      minHeight: 128,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor: colors.card,
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 13,
      overflow: "hidden",
    },
    // Two lines reserved so one- and two-line titles keep every chip aligned,
    // and `auto` floors the read time whichever it runs to.
    guideLabel: { marginTop: 12, fontSize: 14, fontFamily: font.semibold, lineHeight: 18, color: colors.label },
    guideMinutes: { marginTop: "auto", paddingTop: 8, fontSize: 11.5, fontFamily: font.medium, color: colors.label3 },
  });
