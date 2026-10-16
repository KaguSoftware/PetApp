import { Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useReduceMotion } from "@/lib/a11y";
import { Icon, Text, haptic, radius, spacing, useTheme, type IconName } from "@/ui";

export const ROW_HEIGHT = 64;
export const ROUND = 48;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * One row of the + panel: bold title, grey status line, round line-icon button.
 * The whole row is the target. Pressing it dips to 0.97 and washes the row with
 * `inverseSurface`; the light haptic fires on touch-down so the tap feels instant.
 */
export function PanelRow({ title, status, icon, onPress }: { title: string; status: string; icon: IconName; onPress: () => void }) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  const wash = useSharedValue(0);
  const rowStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const washStyle = useAnimatedStyle(() => ({ opacity: wash.value }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        haptic("tap");
        wash.set(withTiming(0.6, { duration: reduceMotion ? 0 : 70 }));
        if (!reduceMotion) scale.set(withSpring(0.97, { damping: 18, stiffness: 520 }));
      }}
      onPressOut={() => {
        wash.set(withTiming(0, { duration: reduceMotion ? 0 : 220 }));
        if (!reduceMotion) scale.set(withSpring(1, { damping: 12, stiffness: 340 }));
      }}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${status}`}
      style={[styles.row, rowStyle]}
    >
      <Animated.View pointerEvents="none" style={[styles.wash, { backgroundColor: colors.inverseSurface }, washStyle]} />
      <View style={styles.text}>
        <Text variant="headline" tone="inverse">
          {title}
        </Text>
        <Text variant="callout" tone="inverse2" numberOfLines={1}>
          {status}
        </Text>
      </View>
      <View style={[styles.round, { backgroundColor: colors.inverseSurface }]}>
        <Icon name={icon} size={22} color={colors.inverseInk} />
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.lg, height: ROW_HEIGHT },
  // Bleeds 10pt into the card's 20pt padding so the wash reads as a padded pill.
  wash: { position: "absolute", top: 0, bottom: 0, left: -10, right: -10, borderRadius: radius.md },
  text: { flex: 1, justifyContent: "center" },
  round: { width: ROUND, height: ROUND, borderRadius: ROUND / 2, alignItems: "center", justifyContent: "center" },
});
