import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { PageButton } from "@/components/plan/Chapter";
import { useReduceMotion } from "@/lib/a11y";
import { dailyFactOffset, factsForPet, renderFactBody } from "@/lib/breedFacts";
import type { Pet } from "@/lib/data";
import { font, useColors, type Colors } from "@/lib/theme";

/**
 * The closing note.
 *
 * This was a card: icon disc, title, body, a hairline foot, a "tap for another"
 * hint and a 3/12 counter — six pieces of chrome around two sentences of
 * trivia, sitting at the same weight as the things the family is actually being
 * asked to do. It is a paragraph now. Trivia is the last thing on a front page
 * for a reason, and a paragraph is what the last thing on a page looks like.
 *
 * Which pet it is about rotates by the day rather than by which one is in
 * trouble, so a two-pet household hears about both and the note doesn't move
 * around under a state change.
 */
export default function Endnote({ pets }: { pets: Pet[] }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const reduceMotion = useReduceMotion();

  // Stable within a day, different tomorrow.
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  const pet = pets[dayIndex % Math.max(1, pets.length)];

  const breed = pet?.breed;
  const species = pet?.species;
  const petId = pet?.id;
  const facts = useMemo(() => (breed && species ? factsForPet({ breed, species }) : []), [breed, species]);
  const offset = useMemo(() => dailyFactOffset(petId ?? "", facts.length), [petId, facts.length]);
  const [step, setStep] = useState(0);
  useEffect(() => setStep(0), [petId]);

  // Each new fact fades and rises in. A plain shared value with NO completion
  // callback — nothing hops back to JS, so an unmount mid-tween can't fire a
  // runOnJS against a torn-down tree (see the Reanimated rule in HANDOFF.md).
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
  const anim = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 5 }],
  }));

  if (!pet || facts.length === 0) return null;

  const fact = facts[(offset + step) % facts.length];
  const body = renderFactBody(fact.body, pet.name);

  return (
    <View>
      <Animated.View style={anim}>
        <Text style={styles.title}>{fact.title}</Text>
        <Text style={styles.body}>{body}</Text>
        <Text style={styles.source}>On {fact.source}</Text>
      </Animated.View>
      <View style={styles.action}>
        <PageButton
          label="Another"
          tint={colors.label2}
          icon="refresh"
          size="sm"
          chevron={false}
          onPress={() => setStep((s) => s + 1)}
        />
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    title: { paddingTop: 12, fontSize: 16.5, fontFamily: font.semibold, letterSpacing: -0.25, color: colors.label },
    body: { marginTop: 5, maxWidth: 380, fontSize: 14.5, fontFamily: font.regular, lineHeight: 22, color: colors.label2 },
    source: { marginTop: 8, fontSize: 12, fontFamily: font.medium, color: colors.label3 },
    action: { marginTop: 14, alignSelf: "flex-start" },
  });
