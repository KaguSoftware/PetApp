import type React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
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
 * stable key, and reanimated CROSS-FADES them — the outgoing view fades out
 * while the incoming one fades in, no directional movement. `direction` is
 * accepted for call-site symmetry but doesn't affect a fade. Reduce Motion — or
 * `animate={false}` — drops the animation and the view just swaps. The caller
 * uses `animate={false}` on a page's FIRST appearance (e.g. the form when the
 * sheet first opens) so only in-place swaps animate, not the initial mount.
 *
 * The parent must key this on the current page so React mounts/unmounts them —
 * that mount/unmount is what triggers the entering/exiting animations.
 */
export function DrillView({
  children,
  animate = true,
  style,
  duration = 220,
}: {
  children: React.ReactNode;
  /** Accepted for call-site symmetry; a cross-fade has no direction. */
  direction?: "forward" | "back";
  animate?: boolean;
  style?: StyleProp<ViewStyle>;
  duration?: number;
}) {
  const reduceMotion = useReduceMotion();
  if (reduceMotion || !animate) return <Animated.View style={style}>{children}</Animated.View>;
  return (
    <Animated.View style={style} entering={FadeIn.duration(duration)} exiting={FadeOut.duration(duration)}>
      {children}
    </Animated.View>
  );
}
