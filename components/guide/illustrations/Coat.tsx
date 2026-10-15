import { StyleSheet, View } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import { Text, useTheme } from "@/ui";

interface CoatProps {
  label: string;
  tool: string;
  tint: string;
  inactive: string;
  top: number;
  under: number;
}

/** Skin line at the bottom, hair above it. Strand length and layers decide the tool. */
function CoatCell({ label, tool, tint, inactive, top, under }: CoatProps) {
  return (
    <View style={styles.item}>
      <Svg width={72} height={52} viewBox="0 0 72 52" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Line x1={8} y1={42} x2={64} y2={42} stroke={inactive} strokeWidth={3} strokeLinecap="round" />
        {under > 0
          ? Array.from({ length: 15 }, (_, i) => (
              <Line key={`u${i}`} x1={9 + i * 3.9} y1={42} x2={9 + i * 3.9} y2={42 - under} stroke={inactive} strokeWidth={1.5} strokeLinecap="round" />
            ))
          : null}
        {Array.from({ length: 8 }, (_, i) => {
          const x = 10 + i * 7.4;
          return (
            <Path
              key={`t${i}`}
              d={`M${x} 42 Q${x + 3} ${42 - top / 2} ${x + 1.5} ${42 - top}`}
              stroke={tint}
              strokeWidth={2.5}
              strokeLinecap="round"
              fill="none"
            />
          );
        })}
      </Svg>
      <Text variant="caption">{label}</Text>
      <Text variant="caption" tone="ink2" style={styles.tool}>
        {tool}
      </Text>
    </View>
  );
}

export function Coat() {
  const { colors } = useTheme();
  const inactive = colors.ink3;
  return (
    <View style={styles.row}>
      <CoatCell label="Short" tool="Curry or bristle" tint={colors.green} inactive={inactive} top={9} under={0} />
      <CoatCell label="Double" tool="Rake, then slicker" tint={colors.amber} inactive={inactive} top={18} under={9} />
      <CoatCell label="Long" tool="Slicker and comb" tint={colors.pink} inactive={inactive} top={28} under={0} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-around", width: "100%" },
  item: { alignItems: "center", gap: 2, flexShrink: 1 },
  tool: { textAlign: "center", fontSize: 11 },
});
