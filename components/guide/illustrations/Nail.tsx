import { StyleSheet, View } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import { Text, useTheme } from "@/ui";
import { Key } from "./Key";

/** A nail with the quick shaded and the safe cut line dashed. */
export function Nail() {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <Svg width={150} height={70} viewBox="0 0 150 70" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Path
          d="M20 35 Q20 20 45 20 L120 30 Q135 35 120 40 L45 50 Q20 50 20 35 Z"
          fill={colors.surface}
          stroke={colors.ink2}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <Path
          d="M23 35 Q23 25 44 25 L70 31 Q74 35 70 39 L44 45 Q23 45 23 35 Z"
          fill={colors.tones.peach.bg}
          stroke={colors.tones.peach.fg}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        <Line x1={96} y1={14} x2={96} y2={56} stroke={colors.green} strokeWidth={3} strokeDasharray="4 5" strokeLinecap="round" />
      </Svg>
      <View style={styles.keys}>
        <Key color={colors.tones.peach.fg} label="the quick: never cut here" />
        <Key color={colors.green} label="safe cut line" />
      </View>
      <Text variant="caption" tone="ink2" style={styles.caption}>
        Always cut well clear of the quick.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 8 },
  keys: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", columnGap: 12 },
  caption: { textAlign: "center" },
});
