import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Icon } from "@/components/Icons";
import { IconCircle, PressableScale, PRESS_SCALE_SMALL, SectionHeader } from "@/components/ui";
import { useReduceMotion } from "@/lib/a11y";
import { dailyFactOffset, factsForPet, renderFactBody } from "@/lib/breedFacts";
import type { Pet } from "@/lib/data";
import { cardShadow, font, radius, useColors, type Colors } from "@/lib/theme";

/**
 * Home "Did you know?" — one piece of trivia about the hero pet's breed, in the
 * spirit of "unlike other breeds, your cat…". Reads from lib/breedFacts.ts:
 * breed-specific lines first, then species-wide ones, so a pet with a free-text
 * breed still gets a full deck instead of an empty card.
 *
 * The card opens on a different fact each day (offset per pet, so two pets in
 * one household aren't showing the same slot), and tapping anywhere on it deals
 * the next one. Deliberately no navigation target — this is ambient content, and
 * a tap that sometimes advances and sometimes pushes a screen is a bad tap.
 */
export default function BreedFactsSection({ pet }: { pet?: Pet }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const reduceMotion = useReduceMotion();

  // Keyed off the two fields the deck actually depends on — the pet object
  // itself is replaced on every store write, which would rebuild this each time.
  const breed = pet?.breed;
  const species = pet?.species;
  const petId = pet?.id;
  const facts = useMemo(() => (breed && species ? factsForPet({ breed, species }) : []), [breed, species]);
  // Which fact this pet opens on today.
  const offset = useMemo(() => dailyFactOffset(petId ?? "", facts.length), [petId, facts.length]);
  // Taps since the card appeared; the visible fact is offset + step, wrapped.
  const [step, setStep] = useState(0);
  // Swiping the hero to another pet deals that pet's own daily fact, not
  // whatever slot the previous pet had been advanced to.
  useEffect(() => setStep(0), [petId]);

  // Each new fact fades and rises into place. Driven by a plain shared value with
  // NO completion callback — nothing hops back to JS, so a pet swap or unmount
  // mid-tween can't fire a runOnJS against a torn-down tree (see the Reanimated
  // rule in HANDOFF.md).
  // Starts hidden so the first paint is the start of the fade, not a flash of
  // the finished state one frame before the effect runs.
  const enter = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) {
      enter.value = 1;
      return;
    }
    enter.value = 0;
    enter.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.quad) });
    return () => cancelAnimation(enter);
  }, [step, petId, reduceMotion, enter]);
  const factAnim = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 6 }],
  }));

  if (!pet || facts.length === 0) return null;

  const index = (offset + step) % facts.length;
  const fact = facts[index];
  const body = renderFactBody(fact.body, pet.name);
  const next = () => setStep((s) => s + 1);

  return (
    <View>
      <SectionHeader
        trailing={
          <PressableScale
            scaleTo={PRESS_SCALE_SMALL}
            onPress={next}
            accessibilityRole="button"
            accessibilityLabel="Show another fact"
            hitSlop={10}
          >
            <View style={styles.shuffleRow}>
              <Icon name="refresh" size={13} color={colors.accent} />
              <Text style={styles.shuffleLabel}>Another</Text>
            </View>
          </PressableScale>
        }
      >
        Did you know?
      </SectionHeader>

      <PressableScale
        onPress={next}
        accessibilityRole="button"
        accessibilityLabel={`${fact.title}. ${body}. Tap for another fact about ${fact.source}.`}
      >
        <View style={styles.card}>
          <View style={styles.head}>
            <IconCircle icon="sparkles" tint={colors.accent} bg={colors.accentSoft} size={36} iconSize={19} />
            <Animated.View style={[styles.headText, factAnim]}>
              <Text numberOfLines={1} style={styles.source}>
                {fact.source}
              </Text>
              <Text numberOfLines={2} style={styles.title}>
                {fact.title}
              </Text>
            </Animated.View>
          </View>

          {/* minHeight keeps the card from resizing under your finger as facts of
              different lengths swap in. */}
          <Animated.View style={[styles.bodyWrap, factAnim]}>
            <Text style={styles.body}>{body}</Text>
          </Animated.View>

          <View style={styles.foot}>
            <Text style={styles.hint}>Tap for another</Text>
            <View style={styles.counter}>
              <Text style={styles.counterLabel}>
                {index + 1}/{facts.length}
              </Text>
            </View>
          </View>
        </View>
      </PressableScale>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    shuffleRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    shuffleLabel: { fontSize: 14, fontFamily: font.semibold, color: colors.accent },
    card: { borderRadius: radius.lg, backgroundColor: colors.card, padding: 16, ...cardShadow },
    head: { flexDirection: "row", alignItems: "center", gap: 12 },
    headText: { flex: 1, minWidth: 0 },
    source: { fontSize: 11, fontFamily: font.semibold, letterSpacing: 0.7, color: colors.label3, textTransform: "uppercase" },
    title: { marginTop: 2, fontSize: 16.5, fontFamily: font.semibold, letterSpacing: -0.2, color: colors.label },
    bodyWrap: { marginTop: 12, minHeight: 66 },
    body: { fontSize: 14.5, fontFamily: font.regular, lineHeight: 21, color: colors.label2 },
    foot: {
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.sep,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    hint: { fontSize: 12.5, fontFamily: font.medium, color: colors.label3 },
    counter: { borderRadius: radius.full, backgroundColor: colors.accentSoft, paddingHorizontal: 9, paddingVertical: 3 },
    counterLabel: { fontSize: 11.5, fontFamily: font.semibold, color: colors.accentDeep },
  });
