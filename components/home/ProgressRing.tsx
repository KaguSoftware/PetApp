import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { cancelAnimation, useAnimatedProps, useSharedValue, withSpring } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

const ACircle = Animated.createAnimatedComponent(Circle);

/**
 * The day-progress ring a pet card wraps its portrait in.
 *
 * Animation follows the AnimatedNumber contract (components/nutrition/atoms.tsx
 * — see the Reanimated rule in HANDOFF.md): the worklet reads ONE shared value
 * and module-scope math only. `fraction` is mirrored into the shared value in an
 * effect; the first render seeds it directly so the ring draws at the right arc
 * with no entrance sweep, and only a CHANGE springs. Colours are plain props
 * resolved on the JS thread — no colour math on the UI thread.
 */
export default function ProgressRing({
  size,
  strokeWidth = 5,
  fraction,
  tint,
  track,
  reduceMotion,
  children,
}: {
  size: number;
  strokeWidth?: number;
  /** 0..1, already clamped by the model. */
  fraction: number;
  /** Arc colour — chosen per tone by the caller. */
  tint: string;
  /** The quiet full circle behind the arc. */
  track: string;
  reduceMotion: boolean;
  /** Sits centred inside the ring (the pet portrait). */
  children?: React.ReactNode;
}) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  const p = useSharedValue(Math.min(1, Math.max(0, fraction)));
  useEffect(() => {
    const target = Math.min(1, Math.max(0, fraction));
    p.value = reduceMotion ? target : withSpring(target, { damping: 18, stiffness: 160 });
    return () => cancelAnimation(p);
  }, [fraction, reduceMotion, p]);

  // `circumference` depends only on props that never change for a mounted ring
  // (size/strokeWidth are literals at every call site), so reading it here is a
  // constant capture, not a changing JS value.
  const animatedProps = useAnimatedProps(() => {
    "worklet";
    return { strokeDashoffset: circumference * (1 - p.value) };
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={strokeWidth} fill="none" />
        <ACircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tint}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          // Start at 12 o'clock and run clockwise.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
});
