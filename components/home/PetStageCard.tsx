import { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import PetAvatar from "@/components/PetAvatar";
import ProgressRing from "@/components/home/ProgressRing";
import { PressableScale } from "@/components/ui";
import type { CareTone } from "@/lib/careDashboard";
import type { PetDayCard } from "@/lib/home";
import { cardShadow, font, radius, useColors, withAlpha, type Colors } from "@/lib/theme";

const RING = 104;
const DOT = 7;

/**
 * One animal on the stage: portrait in a day-progress ring, its name, and a
 * strip of state dots — one per lever, in the same stable order as the tiles
 * below, so the card IS the tile row in miniature. No sentences: the ring says
 * how much of the day is done, the dots say what kind of thing is owed, the
 * wash says someone is behind. VoiceOver gets the words instead.
 *
 * Selection animation follows the HANDOFF worklet rule: the `selected` boolean
 * is mirrored into a shared value in an effect and the worklet reads only that.
 */
export default function PetStageCard({
  card,
  width,
  selected,
  reduceMotion,
  onPress,
}: {
  card: PetDayCard;
  width: number;
  selected: boolean;
  reduceMotion: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const TONE_INK: Record<CareTone, string> = {
    overdue: colors.red,
    due: colors.orange,
    open: colors.accent,
    done: colors.green,
    idle: colors.label3,
  };

  const ink = TONE_INK[card.tone];
  const behind = card.tone === "overdue" || card.tone === "due";
  const wash = card.tone === "overdue" ? colors.redSoft : card.tone === "due" ? colors.orangeSoft : undefined;

  const sel = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    const target = selected ? 1 : 0;
    sel.value = reduceMotion ? target : withSpring(target, { damping: 16, stiffness: 220 });
    return () => cancelAnimation(sel);
  }, [selected, reduceMotion, sel]);
  const anim = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: 0.72 + sel.value * 0.28,
      transform: [{ scale: 0.965 + sel.value * 0.035 }],
    };
  });

  const { pet, progress } = card;

  return (
    <Animated.View style={[{ width }, anim]}>
      {/* Hats spill above the avatar disc but the ring + top padding keep them
          inside the card bounds, so the default offscreen compositing (the
          Android shadow-leak fix) stays on. */}
      <PressableScale
        haptic
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={card.a11ySummary}
        accessibilityHint={`Shows ${pet.name}'s day`}
      >
        <View
          style={[
            styles.card,
            wash != null && { backgroundColor: wash },
            behind && { borderColor: withAlpha(ink, 0.35) },
            selected && !behind && { borderColor: withAlpha(colors.accent, 0.45) },
          ]}
        >
          <ProgressRing
            size={RING}
            fraction={progress.fraction}
            tint={ink}
            track={withAlpha(colors.label, 0.08)}
            reduceMotion={reduceMotion}
          >
            {/* Idle only while selected: one wobbling sprite is alive, four is a
                waiting room. Reduce-motion stills them all. */}
            <PetAvatar pet={pet} size="lg" idle={selected && !reduceMotion} />
          </ProgressRing>
          <Text numberOfLines={1} style={styles.name}>
            {pet.name}
          </Text>
          <View style={styles.dots} importantForAccessibility="no-hide-descendants">
            {card.tasks.map((t) => (
              <View key={t.id} style={[styles.dot, { backgroundColor: TONE_INK[t.tone] }]} />
            ))}
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    card: {
      alignItems: "center",
      // Top padding leaves headroom for hat cosmetics, which draw above the
      // avatar disc but stay inside the card bounds (Android touch rule).
      paddingTop: 18,
      paddingBottom: 16,
      paddingHorizontal: 12,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.sep,
      backgroundColor: colors.card,
      ...cardShadow,
    },
    name: { marginTop: 10, fontSize: 17, fontFamily: font.bold, letterSpacing: -0.35, color: colors.label },
    dots: { marginTop: 8, flexDirection: "row", gap: 6 },
    dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
  });
