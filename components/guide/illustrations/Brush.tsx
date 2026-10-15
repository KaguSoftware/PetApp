import { StyleSheet, View } from "react-native";
import Svg, { Line, Path, Rect } from "react-native-svg";
import { Text, useTheme } from "@/ui";

/** A tooth with the brush held at roughly 45 degrees. */
export function Brush() {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <Svg width={160} height={80} viewBox="0 0 160 80" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Line x1={16} y1={62} x2={144} y2={62} stroke={colors.ink3} strokeWidth={3} strokeLinecap="round" />
        <Rect x={64} y={32} width={30} height={30} rx={10} fill={colors.surface} stroke={colors.ink2} strokeWidth={3} />
        <Line x1={100} y1={28} x2={134} y2={6} stroke={colors.ink2} strokeWidth={6} strokeLinecap="round" />
        <Path d="M92 36 l12 -9" stroke={colors.blue} strokeWidth={10} strokeLinecap="round" />
      </Svg>
      <Text variant="caption" tone="ink2" style={styles.caption}>
        Hold the brush at about 45 degrees to the gum line.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 8 },
  caption: { textAlign: "center" },
});
