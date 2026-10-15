import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withSpring,
} from "react-native-reanimated";
import { Text, haptic, radius, spacing, useTheme } from "@/ui";

/** Pixels the ruler moves per 0.1 step. */
const STEP_PX = 14;
const MIN = 1;
const MAX = 9999;

const clamp = (v: number) => Math.min(MAX, Math.max(MIN, v));

interface WeightDialProps {
  /** Value in tenths of the display unit (so 12.3 kg is 123). */
  tenths: number;
  onChange: (tenths: number) => void;
}

/** A horizontal ruler you spin with a finger: drag left to go up, right to go down, 0.1 per tick. */
export function WeightDial({ tenths, onChange }: WeightDialProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [shown, setShown] = useState(tenths);
  const last = useRef(tenths);
  const pos = useSharedValue(tenths);
  const startPos = useSharedValue(tenths);

  const sync = (r: number) => {
    if (r === last.current) return;
    last.current = r;
    setShown(r);
    onChange(r);
    haptic("select");
  };

  // The ruler is the source of truth while touched; this reports the rounded value to React.
  useAnimatedReaction(
    () => Math.round(pos.value),
    (r, prev) => {
      if (prev !== null && r !== prev) runOnJS(sync)(r);
    },
  );

  // A value typed elsewhere jumps the ruler to it.
  useEffect(() => {
    if (tenths === last.current) return;
    last.current = tenths;
    setShown(tenths);
    pos.value = tenths;
  }, [tenths, pos]);

  const half = Math.ceil(width / 2 / STEP_PX) + 2;
  const indices = useMemo(() => Array.from({ length: half * 2 + 1 }, (_, i) => i - half), [half]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          startPos.value = pos.value;
        })
        .onUpdate((e) => {
          pos.value = Math.min(MAX, Math.max(MIN, startPos.value - e.translationX / STEP_PX));
        })
        .onEnd((e) => {
          pos.value = withDecay({ velocity: -e.velocityX / STEP_PX, clamp: [MIN, MAX] }, () => {
            pos.value = withSpring(Math.round(pos.value), { damping: 20, stiffness: 260 });
          });
        }),
    [pos, startPos],
  );

  const strip = useAnimatedStyle(() => ({ transform: [{ translateX: -(pos.value - Math.round(pos.value)) * STEP_PX }] }));

  return (
    <GestureDetector gesture={pan}>
      <View
        style={styles.wrap}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Weight dial"
        accessibilityValue={{ text: String(shown / 10) }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => {
          pos.value = clamp(shown + (e.nativeEvent.actionName === "increment" ? 1 : -1));
        }}
      >
        <Animated.View style={[styles.strip, strip]}>
          {indices.map((i) => {
            const v = shown + i;
            if (v < MIN || v > MAX) return <View key={i} style={styles.slot} />;
            const whole = v % 10 === 0;
            const mid = v % 5 === 0;
            return (
              <View key={i} style={styles.slot}>
                <View
                  style={[
                    styles.tick,
                    { backgroundColor: whole ? colors.ink : colors.ink3, height: whole ? 38 : mid ? 26 : 16, opacity: whole ? 1 : 0.7 },
                  ]}
                />
                {whole ? (
                  <Text variant="caption" tone="ink2" style={styles.tickLabel} numberOfLines={1}>
                    {v / 10}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </Animated.View>
        <View pointerEvents="none" style={[styles.needle, { backgroundColor: colors.green }]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 84, overflow: "hidden", justifyContent: "center", marginHorizontal: -spacing.xl },
  strip: { flexDirection: "row", justifyContent: "center", alignItems: "flex-start" },
  slot: { width: STEP_PX, alignItems: "center", height: 70 },
  tick: { width: 3, borderRadius: 2 },
  tickLabel: { position: "absolute", top: 42, width: 40, textAlign: "center" },
  needle: { position: "absolute", alignSelf: "center", top: 8, width: 4, height: 54, borderRadius: radius.pill },
});
