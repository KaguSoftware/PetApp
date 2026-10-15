import { StyleSheet, View } from "react-native";
import Svg, { Circle, Ellipse, Line } from "react-native-svg";
import { Text, useTheme } from "@/ui";

/** Three side-on bodies: too thin, ideal, overweight. */
export function Body() {
  const { colors } = useTheme();
  const items = [
    { rx: 13, label: "Too thin", tint: colors.amber },
    { rx: 18, label: "Ideal", tint: colors.green },
    { rx: 25, label: "Overweight", tint: colors.pink },
  ];
  return (
    <View style={styles.row}>
      {items.map((b) => (
        <View key={b.label} style={styles.item}>
          <Svg width={72} height={56} viewBox="0 0 72 56" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Ellipse cx={38} cy={30} rx={b.rx} ry={15} fill={colors.surface} stroke={b.tint} strokeWidth={3} />
            <Circle cx={38 - b.rx - 4} cy={24} r={9} fill={colors.surface} stroke={b.tint} strokeWidth={3} />
            <Line x1={56} y1={20} x2={64} y2={12} stroke={b.tint} strokeWidth={3} strokeLinecap="round" />
          </Svg>
          <Text variant="caption" tone="ink2">
            {b.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-around", width: "100%" },
  item: { alignItems: "center", gap: 4 },
});
