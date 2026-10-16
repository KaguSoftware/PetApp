import { FadeIn, FadeInDown, LinearTransition } from "react-native-reanimated";
import { useReduceMotion } from "@/lib/a11y";

const MS = 200;

/**
 * Enter / layout animations for list items. Short (200ms) and gone entirely under reduce motion.
 * Spread onto an `Animated.View`: `<Animated.View {...useItemMotion(index)} />`.
 * New rows fade in; rows around an insert or removal slide into place instead of jumping.
 */
export function useItemMotion(index = 0, kind: "down" | "fade" = "down") {
  const reduce = useReduceMotion();
  if (reduce) return {};
  const delay = Math.min(index, 8) * 24;
  const base = kind === "down" ? FadeInDown : FadeIn;
  return { entering: base.duration(MS).delay(delay), layout: LinearTransition.duration(MS) };
}
