import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { Icon } from "@/components/Icons";
import { PRESS_SCALE_SMALL, PressableScale } from "@/components/ui";
import { WeightPoint, formatWeight } from "@/lib/data";
import { colors, font, radius } from "@/lib/theme";

const WINDOW_SIZE = 6;

function spanText(fromTs: number, toTs: number) {
  const days = Math.round((toTs - fromTs) / 86_400_000);
  if (days < 1) return null;
  if (days < 14) return `${days}d`;
  if (days < 60) return `${Math.round(days / 7)}w`;
  return `${Math.round(days / 30)}mo`;
}

function AddButton({ onPress }: { onPress: () => void }) {
  return (
    <PressableScale scaleTo={PRESS_SCALE_SMALL} onPress={onPress} accessibilityRole="button" accessibilityLabel="Add weight" hitSlop={10}>
      <View style={styles.addButton}>
        <Icon name="plus" size={11} color={colors.accent} />
        <Text style={styles.addLabel}>Add</Text>
      </View>
    </PressableScale>
  );
}

function RangeFooter({ target, units, onAddWeight }: { target?: [number, number]; units: "kg" | "lb"; onAddWeight?: () => void }) {
  if (!target && !onAddWeight) return null;
  return (
    <View style={styles.footerRow}>
      {target ? (
        <Text style={styles.rangeText}>
          Healthy range: <Text style={styles.rangeValue}>{formatWeight(target[0], units)}–{formatWeight(target[1], units)}</Text>
        </Text>
      ) : (
        <View />
      )}
      {onAddWeight ? <AddButton onPress={onAddWeight} /> : null}
    </View>
  );
}

/**
 * Small weight trend chart: straight line segments over gridlines, with an
 * optional target-range band. SVG so it stays crisp. Shows a sliding 6-point
 * window over the full history; left/right arrows shift the window one record
 * at a time.
 */
export default function PixelChart({
  points: allPoints,
  target,
  units,
  height = 120,
  onAddWeight,
}: {
  points: WeightPoint[];
  target?: [number, number];
  units: "kg" | "lb";
  height?: number;
  onAddWeight?: () => void;
}) {
  const maxStart = Math.max(0, allPoints.length - WINDOW_SIZE);
  // Track the point count alongside the window start so that whenever a new
  // weight is logged (points array grows/shrinks), the window jumps back to
  // the newest points during render instead of getting stuck on a stale
  // spot — manual left/right navigation only changes `start`, not
  // `pointCount`, so it's unaffected.
  const [{ pointCount, start: rawStart }, setWindow] = useState({ pointCount: allPoints.length, start: maxStart });
  if (allPoints.length !== pointCount) {
    setWindow({ pointCount: allPoints.length, start: Math.max(0, allPoints.length - WINDOW_SIZE) });
  }
  const setStart = (updater: (s: number) => number) => setWindow((s) => ({ ...s, start: updater(s.start) }));
  const start = Math.min(rawStart, maxStart);
  const points = allPoints.slice(start, start + WINDOW_SIZE);

  // Too little history to draw a line — show the latest weight and a hint
  // rather than an empty box, so the section is never blank and the user can
  // confirm a logged weight was recorded.
  if (allPoints.length < 2) {
    const latest = allPoints[allPoints.length - 1];
    return (
      <View style={styles.emptyWrap}>
        {latest ? (
          <>
            <Text style={styles.emptyWeight}>{formatWeight(latest.kg, units)}</Text>
            <Text style={styles.emptyHint}>Log another weight to see the trend.</Text>
          </>
        ) : (
          <Text style={styles.emptyNone}>No weight logged yet — tap the weight chip to add one.</Text>
        )}
        <RangeFooter target={target} units={units} onAddWeight={onAddWeight} />
      </View>
    );
  }

  const W = 100;
  const H = 60;
  const pad = 4;

  const kgs = points.map((p) => p.kg);
  const lo = Math.min(...kgs, target?.[0] ?? Infinity);
  const hi = Math.max(...kgs, target?.[1] ?? -Infinity);
  const span = hi - lo || 1;
  const min = lo - span * 0.15;
  const max = hi + span * 0.15;

  const x = (i: number) => pad + (i / (points.length - 1)) * (W - pad * 2);
  const y = (kg: number) => H - pad - ((kg - min) / (max - min)) * (H - pad * 2);

  const bandTop = target ? y(target[1]) : 0;
  const bandBot = target ? y(target[0]) : 0;

  // straight line segments between points — a calm, standard health-app trend line
  let d = `M ${x(0)} ${y(points[0].kg)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${x(i)} ${y(points[i].kg)}`;
  }

  const last = points[points.length - 1];
  const first = points[0];
  const delta = last.kg - first.kg;
  const spanLabel = points.length > 1 ? spanText(first.ts, last.ts) : null;

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.headerWeight}>{formatWeight(last.kg, units)}</Text>
        <Text numberOfLines={1} style={[styles.delta, { color: delta >= 0 ? colors.orange : colors.green }]}>
          {delta >= 0 ? "▲" : "▼"} {formatWeight(Math.abs(delta), units)}
          {spanLabel ? ` over ${spanLabel}` : ""}
        </Text>
        {maxStart > 0 ? (
          <View style={styles.navRow}>
            <PressableScale
              scaleTo={PRESS_SCALE_SMALL}
              onPress={() => setStart((s) => Math.max(0, s - 1))}
              disabled={start === 0}
              accessibilityRole="button"
              accessibilityLabel="Older weight"
              accessibilityState={{ disabled: start === 0 }}
              hitSlop={10}
            >
              <View style={[styles.navButton, start === 0 && { opacity: 0.3 }]}>
                <Icon name="chevron-left" size={13} color={colors.label2} />
              </View>
            </PressableScale>
            <PressableScale
              scaleTo={PRESS_SCALE_SMALL}
              onPress={() => setStart((s) => Math.min(maxStart, s + 1))}
              disabled={start === maxStart}
              accessibilityRole="button"
              accessibilityLabel="Newer weight"
              accessibilityState={{ disabled: start === maxStart }}
              hitSlop={10}
            >
              <View style={[styles.navButton, start === maxStart && { opacity: 0.3 }]}>
                <Icon name="chevron-right" size={13} color={colors.label2} />
              </View>
            </PressableScale>
          </View>
        ) : null}
      </View>
      <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height}>
        {/* gridlines */}
        {[0.25, 0.5, 0.75].map((g) => (
          <Line
            key={g}
            x1={pad}
            x2={W - pad}
            y1={pad + g * (H - pad * 2)}
            y2={pad + g * (H - pad * 2)}
            stroke={colors.sep}
            strokeWidth={0.4}
          />
        ))}
        {/* target band */}
        {target ? (
          <Rect x={pad} y={bandTop} width={W - pad * 2} height={Math.max(0, bandBot - bandTop)} rx={1} fill={colors.greenSoft} />
        ) : null}
        {/* trend line */}
        <Path d={d} fill="none" stroke={colors.accent} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        {/* data points */}
        {points.map((p, i) => (
          <Circle key={i} cx={x(i)} cy={y(p.kg)} r={1.4} fill={colors.card} stroke={colors.accent} strokeWidth={1} />
        ))}
      </Svg>
      <RangeFooter target={target} units={units} onAddWeight={onAddWeight} />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { alignItems: "center", paddingVertical: 12 },
  emptyWeight: { fontSize: 17, fontFamily: font.bold, color: colors.label },
  emptyHint: { marginTop: 6, fontSize: 12, fontFamily: font.regular, color: colors.label2, textAlign: "center" },
  emptyNone: { fontSize: 13, fontFamily: font.regular, color: colors.label2, textAlign: "center" },
  footerRow: { marginTop: 8, width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  rangeText: { flexShrink: 1, fontSize: 12, fontFamily: font.regular, color: colors.label2 },
  rangeValue: { fontFamily: font.semibold, color: colors.green },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.full,
    backgroundColor: colors.fill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addLabel: { fontSize: 12, fontFamily: font.semibold, color: colors.accent },
  headerRow: { marginBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  headerWeight: { fontSize: 15, fontFamily: font.bold, color: colors.label },
  delta: { flex: 1, minWidth: 0, fontSize: 12, fontFamily: font.semibold },
  navRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  navButton: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
});
