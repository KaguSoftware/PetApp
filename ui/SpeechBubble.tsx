import { useEffect } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated";
import { useReduceMotion } from "@/lib/a11y";
import { Text } from "./Text";
import { useTheme } from "./theme";
import { borderWidth, radius, spacing } from "./tokens";

export interface SpeechBubbleProps {
  text: string;
  /** Where the tail points, i.e. where the speaker is. */
  tail?: "bottom" | "left";
  style?: StyleProp<ViewStyle>;
}

const TAIL = 14;

export function SpeechBubble({ text, tail = "bottom", style }: SpeechBubbleProps) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const pop = useSharedValue(reduceMotion ? 1 : 0);

  // Re-pop whenever the line changes so a new reaction reads as a new utterance.
  useEffect(() => {
    if (reduceMotion) {
      pop.value = 1;
      return;
    }
    pop.value = 0;
    pop.value = withDelay(60, withSpring(1, { damping: 9, stiffness: 220 }));
  }, [text, reduceMotion, pop]);

  const animated = useAnimatedStyle(() => ({
    opacity: withTiming(pop.value > 0.05 ? 1 : 0, { duration: 120 }),
    transform: [{ scale: 0.6 + 0.4 * pop.value }],
  }));

  const tailStyle =
    tail === "bottom"
      ? { bottom: -TAIL / 2 - borderWidth / 2, alignSelf: "center" as const }
      : { left: -TAIL / 2 - borderWidth / 2, top: spacing.xl };

  return (
    <Animated.View style={[styles.wrap, tail === "bottom" ? styles.originBottom : styles.originLeft, animated, style]}>
      <View style={[styles.bubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text variant="bodyStrong" style={styles.text}>
          {text}
        </Text>
      </View>
      {/* A rotated square half-hidden behind the bubble edge: borders only show on the outside. */}
      <View
        style={[
          styles.tail,
          { backgroundColor: colors.surface, borderColor: colors.border },
          tailStyle,
          tail === "bottom" ? styles.tailBottom : styles.tailLeft,
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: "center", maxWidth: "88%" },
  originBottom: { transformOrigin: "50% 100%" },
  originLeft: { transformOrigin: "0% 50%" },
  bubble: {
    borderRadius: radius.lg,
    borderWidth,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
  },
  text: { textAlign: "center" },
  tail: { position: "absolute", width: TAIL, height: TAIL, borderWidth, transform: [{ rotate: "45deg" }], zIndex: -1 },
  tailBottom: { borderTopWidth: 0, borderLeftWidth: 0 },
  tailLeft: { borderTopWidth: 0, borderRightWidth: 0 },
});
