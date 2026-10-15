import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useReduceMotion } from "@/lib/a11y";
import { useTheme } from "./theme";

interface ParticleSpec {
  dx: number;
  dy: number;
  spin: number;
  size: number;
  color: string;
  heart: boolean;
}

const COUNT = 18;
const DURATION = 1100;

function Particle({ spec }: { spec: ParticleSpec }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: DURATION, easing: Easing.out(Easing.cubic) });
  }, [t]);

  const style = useAnimatedStyle(() => {
    // Ease-out outward burst, then gravity pulls the fall: y gets an extra t^2 term.
    const fall = t.value * t.value * 90;
    return {
      opacity: t.value < 0.7 ? 1 : 1 - (t.value - 0.7) / 0.3,
      transform: [
        { translateX: spec.dx * t.value },
        { translateY: spec.dy * t.value + fall },
        { rotate: `${spec.spin * t.value}deg` },
        { scale: 0.4 + 0.6 * Math.min(1, t.value * 4) },
      ],
    };
  });

  return (
    <Animated.View style={[styles.particle, { width: spec.size, height: spec.size }, style]}>
      {spec.heart ? (
        <Svg width={spec.size} height={spec.size} viewBox="0 0 24 24">
          <Path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11Z" fill={spec.color} />
        </Svg>
      ) : (
        <View style={{ flex: 1, borderRadius: spec.size / 2, backgroundColor: spec.color }} />
      )}
    </Animated.View>
  );
}

/**
 * One-shot burst of small dots and hearts from the centre of its box. Bump
 * `burstKey` to fire again; 0 renders nothing. Place it absolutely over the
 * area it should celebrate; it never intercepts touches.
 */
export function Confetti({ burstKey }: { burstKey: number }) {
  const reduceMotion = useReduceMotion();
  const { colors } = useTheme();

  const specs = useMemo<ParticleSpec[]>(() => {
    const palette = [colors.green, colors.amber, colors.blue, colors.pink];
    return Array.from({ length: COUNT }, (_, i) => {
      const angle = (i / COUNT) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 90 + Math.random() * 90;
      return {
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - 50,
        spin: (Math.random() - 0.5) * 360,
        size: 8 + Math.random() * 8,
        color: palette[i % palette.length],
        heart: i % 3 === 0,
      };
    });
    // Re-roll per burst.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burstKey, colors]);

  if (burstKey === 0 || reduceMotion) return null;
  return (
    <View pointerEvents="none" style={styles.root} key={burstKey}>
      {specs.map((spec, i) => (
        <Particle key={i} spec={spec} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  particle: { position: "absolute" },
});
