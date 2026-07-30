import type React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from "react-native-reanimated";
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

/**
 * One "page" of a swap flow within a fixed container (e.g. swapping the schedule
 * form for the time-wheel picker inside a Sheet). Give each swapped-in view a
 * stable key and reanimated SLIDES them horizontally, mirroring a native stack
 * push/pop: drilling `forward` brings the new page in from the right while the
 * old one leaves to the left; going `back` reverses it.
 *
 * Reduce Motion — or `animate={false}` — drops the animation and the view just
 * swaps. The caller uses `animate={false}` on a page's FIRST appearance (e.g.
 * the form when the sheet first opens) so only in-place swaps animate, not the
 * initial mount.
 *
 * The parent must key this on the current page so React mounts/unmounts them —
 * that mount/unmount is what triggers the entering/exiting animations. The
 * parent should also clip overflow, or the sliding pages are visible outside it.
 */
export function DrillView({
  children,
  direction = "forward",
  animate = true,
  style,
  duration = 220,
}: {
  children: React.ReactNode;
  /** `forward` drills in (new page from the right); `back` returns to the previous one. */
  direction?: "forward" | "back";
  animate?: boolean;
  style?: StyleProp<ViewStyle>;
  duration?: number;
}) {
  const reduceMotion = useReduceMotion();
  if (reduceMotion || !animate) return <Animated.View style={style}>{children}</Animated.View>;
  const forward = direction === "forward";
  return (
    <Animated.View
      style={style}
      entering={(forward ? SlideInRight : SlideInLeft).duration(duration)}
      exiting={(forward ? SlideOutLeft : SlideOutRight).duration(duration)}
    >
      {children}
    </Animated.View>
  );
}
