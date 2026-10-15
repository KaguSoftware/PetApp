import { StyleSheet, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { Text, useTheme } from "@/ui";
import { Key } from "./Key";

/** One bar is one day's food: treats take a bite out of the same bar. */
export function Portion() {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <Svg width={180} height={64} viewBox="0 0 180 64" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Rect x={9} y={19} width={162} height={28} rx={14} fill={colors.surface} />
        <Rect x={11} y={21} width={66} height={24} rx={12} fill={colors.green} />
        <Rect x={81} y={21} width={66} height={24} rx={12} fill={colors.green} opacity={0.55} />
        <Rect x={151} y={21} width={18} height={24} rx={9} fill={colors.amber} />
        <Path d="M11 14 L11 8 L169 8 L169 14" stroke={colors.ink3} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <View style={styles.keys}>
        <Key color={colors.green} label="set meals" />
        <Key color={colors.amber} label="treats" />
      </View>
      <Text variant="caption" tone="ink2" style={styles.caption}>
        One day&apos;s food. Treats come out of it, not on top.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 8 },
  keys: { flexDirection: "row", columnGap: 12 },
  caption: { textAlign: "center" },
});
