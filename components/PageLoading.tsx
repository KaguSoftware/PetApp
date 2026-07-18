import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { colors, radius } from "@/lib/theme";

/**
 * Hydration placeholder rows — pulsing skeletons so tab chrome doesn't pop
 * and no false empty state ever shows during the initial DB load.
 */
export default function PageLoading({ rows = 3 }: { rows?: number }) {
  const opacity = useSharedValue(0.6);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.35, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.6, { duration: 700, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <View style={styles.wrap} accessibilityLabel="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Animated.View key={i} style={[styles.row, style]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginTop: 12 },
  row: { height: 68, borderRadius: radius.md, backgroundColor: colors.card },
});
