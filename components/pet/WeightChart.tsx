import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { useTheme } from "@/ui";

const HEIGHT = 140;
const PAD_X = 14;
const PAD_Y = 18;

interface Pt {
  x: number;
  y: number;
}

/** Catmull-Rom to cubic bezier: a smooth curve through every point without overshoot spikes. */
export function smoothPath(pts: Pt[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0].x} ${pts[0].y}`;
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    // Clamp control-point heights to the segment so the line never dips past a real value.
    const lo = Math.min(p1.y, p2.y);
    const hi = Math.max(p1.y, p2.y);
    const cy1 = Math.min(hi, Math.max(lo, c1.y));
    const cy2 = Math.min(hi, Math.max(lo, c2.y));
    d += ` C${c1.x.toFixed(1)} ${cy1.toFixed(1)} ${c2.x.toFixed(1)} ${cy2.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export function WeightChart({ values, label }: { values: number[]; label: string }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const line = colors.ink;

  let body: React.ReactNode = null;
  if (width > 0 && values.length > 0) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const innerW = width - PAD_X * 2;
    const pts: Pt[] = values.map((v, i) => ({
      x: values.length === 1 ? width / 2 : PAD_X + (innerW * i) / (values.length - 1),
      y: max === min ? HEIGHT / 2 : PAD_Y + (HEIGHT - PAD_Y * 2) * (1 - (v - min) / span),
    }));
    const last = pts[pts.length - 1];
    body = (
      <Svg width={width} height={HEIGHT}>
        {[0, 0.5, 1].map((f) => {
          const y = PAD_Y + (HEIGHT - PAD_Y * 2) * f;
          return <Line key={f} x1={PAD_X} x2={width - PAD_X} y1={y} y2={y} stroke={colors.ink3} strokeOpacity={0.45} strokeWidth={StyleSheet.hairlineWidth} />;
        })}
        <Path d={smoothPath(pts)} stroke={line} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {pts.slice(0, -1).map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill={colors.surface} stroke={line} strokeWidth={1.25} />
        ))}
        <Circle cx={last.x} cy={last.y} r={4} fill={line} />
      </Svg>
    );
  }

  return (
    <View
      onLayout={(e) => setWidth(Math.floor(e.nativeEvent.layout.width))}
      style={styles.box}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { height: HEIGHT, alignSelf: "stretch" },
});
