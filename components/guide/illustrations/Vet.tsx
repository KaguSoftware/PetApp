import { StyleSheet, View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { Text, useTheme } from "@/ui";

interface YearProps {
  label: string;
  tint: string;
  line: string;
  ring: string;
  visits: number[];
}

/** A 12-month line with wellness exams marked as dots. */
function Year({ label, tint, line, ring, visits }: YearProps) {
  return (
    <View style={styles.item}>
      <Svg width={108} height={38} viewBox="0 0 108 38" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Line x1={10} y1={22} x2={98} y2={22} stroke={line} strokeWidth={3} strokeLinecap="round" />
        {[0, 3, 6, 9, 12].map((m) => (
          <Line key={m} x1={10 + (m / 12) * 88} y1={17} x2={10 + (m / 12) * 88} y2={27} stroke={line} strokeWidth={2} strokeLinecap="round" />
        ))}
        {visits.map((m) => (
          <Circle key={m} cx={10 + (m / 12) * 88} cy={22} r={6.5} fill={tint} stroke={ring} strokeWidth={2} />
        ))}
      </Svg>
      <Text variant="caption" style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

export function Vet() {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Year label="Most adults: yearly" tint={colors.ink2} line={colors.ink3} ring={colors.surface} visits={[12]} />
        <Year label="Seniors: often twice a year" tint={colors.ink3} line={colors.ink3} ring={colors.surface} visits={[6, 12]} />
      </View>
      <Text variant="caption" tone="ink2" style={styles.caption}>
        Ticks are 3 months. Dots are wellness exams. Your vet knows best.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 8, width: "100%" },
  row: { flexDirection: "row", justifyContent: "space-around", width: "100%" },
  item: { alignItems: "center", gap: 2, flexShrink: 1 },
  label: { textAlign: "center" },
  caption: { textAlign: "center" },
});
