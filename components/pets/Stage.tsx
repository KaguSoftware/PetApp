import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Defs, Line, RadialGradient, Rect, Stop } from "react-native-svg";
import Pet3D from "@/components/pixel/Pet3D";
import { useReduceMotion } from "@/lib/a11y";
import type { Pet } from "@/lib/data";
import { font, useColors, type Colors } from "@/lib/theme";

/** Retro grid pitch. Small enough to read as texture, not as a table. */
const GRID_STEP = 14;
const HEIGHT = 300;

/**
 * The dressing stage — a bleed, not a box.
 *
 * It used to be a shadowed card with a hard rounded edge, which made the one
 * genuinely three-dimensional thing in the app look like it was sitting on a
 * piece of paper. There is no container now: a soft pool of light and a retro
 * grid are painted straight onto the page and vignetted back into it, so the
 * grid has no edge to be a border. The pet floats because the pet floats, not
 * because a shadow says so.
 *
 * Three layers, all of them just gradients and lines, so nothing here needs a
 * mask or a clip path:
 *   1. a radial glow under the animal,
 *   2. the grid,
 *   3. a second radial, transparent in the middle and the page colour at the
 *      rim, painted OVER the grid — which is what dissolves the rectangle.
 */
export default function Stage({ pet, pulse }: { pet: Pet; pulse: number }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const reduceMotion = useReduceMotion();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  // A buy or an equip pops the animal. `pulse` is a plain counter from the
  // page; the worklet only ever reads the shared value this effect writes, so
  // nothing captures a changing JS value (see the Reanimated rule in HANDOFF).
  const scale = useSharedValue(1);
  useEffect(() => {
    if (pulse === 0 || reduceMotion) return;
    scale.value = withSequence(
      withTiming(1.16, { duration: 160, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) })
    );
    return () => cancelAnimation(scale);
  }, [pulse, reduceMotion, scale]);
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const vLines = width > 0 ? Array.from({ length: Math.floor(width / GRID_STEP) }, (_, i) => (i + 1) * GRID_STEP) : [];
  const hLines = Array.from({ length: Math.floor(HEIGHT / GRID_STEP) }, (_, i) => (i + 1) * GRID_STEP);
  // Big enough to be the page's lead image, capped so it can't crowd a small
  // phone's gutters.
  const petSize = width > 0 ? Math.min(224, Math.round(width * 0.62)) : 200;

  return (
    <View style={styles.stage} onLayout={onLayout}>
      {width > 0 ? (
        <Svg width={width} height={HEIGHT} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <RadialGradient id="stageGlow" cx="50%" cy="42%" rx="58%" ry="52%">
              <Stop offset="0" stopColor={colors.arcadeGlow} />
              <Stop offset="1" stopColor={colors.arcadeGlow} stopOpacity={0} />
            </RadialGradient>
            {/* The dissolve. Transparent while the grid should read, then the
                page colour by the rim, so the grid ends in the page rather than
                at an edge. */}
            <RadialGradient id="stageFade" cx="50%" cy="46%" rx="62%" ry="58%">
              <Stop offset="0.35" stopColor={colors.bg} stopOpacity={0} />
              <Stop offset="1" stopColor={colors.bg} stopOpacity={1} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={width} height={HEIGHT} fill="url(#stageGlow)" />
          {vLines.map((x) => (
            <Line key={`v${x}`} x1={x} y1={0} x2={x} y2={HEIGHT} stroke={colors.arcadeGrid} strokeWidth={1} />
          ))}
          {hLines.map((y) => (
            <Line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke={colors.arcadeGrid} strokeWidth={1} />
          ))}
          <Rect x={0} y={0} width={width} height={HEIGHT} fill="url(#stageFade)" />
        </Svg>
      ) : null}

      <Animated.View style={[styles.petWrap, pop]}>
        <Pet3D pet={pet} size={petSize} />
      </Animated.View>

      {/* The spin is the one gesture on this page nothing else announces. */}
      <Text style={styles.hint}>drag to spin</Text>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    stage: { marginTop: 4, height: HEIGHT, alignItems: "center", justifyContent: "center" },
    petWrap: { alignItems: "center", justifyContent: "center" },
    hint: {
      position: "absolute",
      bottom: 10,
      fontSize: 11,
      fontFamily: font.medium,
      letterSpacing: 0.4,
      color: colors.label3,
    },
  });
