import type React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useReduceMotion } from "@/lib/a11y";

/**
 * Small entrance-animation wrappers used across screens. Every one is gated on
 * the effective Reduce Motion signal (in-app pref OR the OS setting) — when it's
 * on, the child renders instantly with no animation, keeping the app usable and
 * respectful of accessibility settings.
 */

/** Fades + rises in. `index` staggers items in a list so they cascade. */
export function FadeInItem({
  children,
  index = 0,
  style,
  duration = 320,
}: {
  children: React.ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
  duration?: number;
}) {
  const reduceMotion = useReduceMotion();
  return (
    <Animated.View
      style={style}
      entering={reduceMotion ? undefined : FadeInDown.duration(duration).delay(Math.min(index, 8) * 45)}
    >
      {children}
    </Animated.View>
  );
}

/** Plain fade-in — for hero/header content that shouldn't move. */
export function FadeInView({
  children,
  style,
  duration = 300,
  delay = 0,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  duration?: number;
  delay?: number;
}) {
  const reduceMotion = useReduceMotion();
  return (
    <Animated.View style={style} entering={reduceMotion ? undefined : FadeIn.duration(duration).delay(delay)}>
      {children}
    </Animated.View>
  );
}
