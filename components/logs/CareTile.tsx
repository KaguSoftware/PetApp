import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { actionTone, Icon } from "@/components/Icons";
import { PressableScale } from "@/components/ui";
import { leverStatusLine, type CareTone, type LeverSummary } from "@/lib/careDashboard";
import { ACTIONS } from "@/lib/data";
import { font, radius, useColors, withAlpha, type Colors } from "@/lib/theme";

/** "+5" coin pill that floats up and fades from a logged tile (~600ms). */
export function CoinPop() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [t]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.25, 1], [0, 1, 0]),
    transform: [
      { translateY: interpolate(t.value, [0, 1], [0, -26]) },
      { scale: interpolate(t.value, [0, 0.25, 1], [0.6, 1.1, 1]) },
    ],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.coinPop, style]}>
      <Text style={styles.coinPopLabel}>+5</Text>
    </Animated.View>
  );
}

/** Every tone's one color, used for the status line, the wash and the pips. */
function toneColor(colors: Colors, tone: CareTone, actionTint: string): string {
  switch (tone) {
    case "overdue":
      return colors.red;
    case "due":
      return colors.accent;
    case "open":
      return colors.orange;
    case "done":
      return colors.green;
    default:
      return actionTint;
  }
}

/**
 * One care lever on the Logs dashboard, for the WHOLE household.
 *
 * The tile body is the log button — that is the thing people came to do, so it
 * gets the entire 47%-wide, 140pt-tall target rather than a 60pt pill on the
 * right of a row. Scheduling is the rarer, quieter intent, so it rides in the
 * corner as a small calendar chip: a sibling of the pressable, never a child,
 * because a nested pressable loses its taps to the parent on Android.
 *
 * Color is the wayfinding. Each action owns a hue (`actionTone`) that washes
 * the tile and fills the icon chip; state overrides that hue only when the
 * lever is asking for something (red overdue, green done), so a glance down the
 * grid reads "which of these is red" before it reads any words.
 */
export default function CareTile({
  summary,
  expanded,
  justLogged,
  now,
  onLog,
  onSchedule,
}: {
  summary: LeverSummary;
  /** This tile's pet chooser is open below it. */
  expanded: boolean;
  /** Flash right after a log landed — check glyph + coin pop. */
  justLogged: boolean;
  now: number;
  onLog: () => void;
  onSchedule: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const label = ACTIONS[summary.type].label;
  const a = actionTone(colors, summary.type);

  const tone: CareTone = justLogged ? "done" : summary.tone;
  const state = toneColor(colors, tone, a.tint);
  const statusLine = justLogged ? "Just logged" : leverStatusLine(summary, now);

  // The wash only shouts when the lever does. A done tile fades almost to the
  // card so the ones still asking for something own the grid.
  const washAlpha = tone === "overdue" ? 0.2 : tone === "due" ? 0.15 : tone === "done" ? 0.07 : 0.12;
  const washColor = tone === "overdue" || tone === "done" ? state : a.tint;

  const chipBg = tone === "overdue" ? colors.redSoft : tone === "done" ? colors.greenSoft : a.bg;
  const chipTint = tone === "overdue" ? colors.red : tone === "done" ? colors.green : a.tint;

  return (
    <View style={styles.slot}>
      <PressableScale
        haptic
        onPress={onLog}
        accessibilityRole="button"
        accessibilityLabel={`Log ${label.toLowerCase()}`}
        accessibilityHint={statusLine}
      >
        <View style={[styles.tile, { borderColor: expanded ? withAlpha(colors.accent, 0.5) : tone === "overdue" ? withAlpha(colors.red, 0.28) : colors.sep }]}>
          <LinearGradient
            pointerEvents="none"
            colors={[withAlpha(washColor, washAlpha), withAlpha(washColor, 0.015)]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={[styles.chip, { backgroundColor: chipBg }]}>
            <Icon name={justLogged || tone === "done" ? "check" : a.icon} size={21} color={chipTint} />
          </View>

          <Text numberOfLines={1} style={styles.label}>
            {label}
          </Text>
          <Text numberOfLines={2} style={[styles.status, { color: tone === "idle" ? colors.label3 : state }]}>
            {statusLine}
          </Text>

          {/* One segment per pet, in household order — which pets are green and
              which are red, without room for their names. Identity arrives on
              tap, in the chooser. */}
          <View style={styles.pipRow}>
            {summary.pets.length > 1
              ? summary.pets.map((p) => (
                  <View
                    key={p.pet.id}
                    style={[styles.pip, { backgroundColor: p.tone === "idle" ? withAlpha(colors.label, 0.16) : toneColor(colors, p.tone, a.tint) }]}
                  />
                ))
              : null}
          </View>
        </View>
      </PressableScale>

      {/* Sibling, not child: keeps the calendar's taps out of the log button's
          responder entirely. elevation as well as zIndex so it stays on top on
          Android too. */}
      <Pressable
        onPress={onSchedule}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`${summary.scheduled ? "Edit" : "Set"} ${label.toLowerCase()} schedule`}
        style={({ pressed }) => [
          styles.calendar,
          summary.scheduled && { backgroundColor: colors.accentSoft, borderColor: withAlpha(colors.accent, 0.32) },
          pressed && { opacity: 0.55 },
        ]}
      >
        <Icon name="calendar" size={15} color={summary.scheduled ? colors.accent : colors.label3} strokeWidth={2.1} />
      </Pressable>

      {justLogged ? <CoinPop /> : null}
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    slot: { flex: 1 },
    tile: {
      minHeight: 142,
      borderRadius: radius.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      padding: 14,
      overflow: "hidden",
    },
    chip: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    label: { marginTop: 14, fontSize: 17, fontFamily: font.semibold, letterSpacing: -0.2, color: colors.label },
    status: { marginTop: 3, paddingRight: 4, fontSize: 12.5, fontFamily: font.medium, lineHeight: 16 },
    // `auto` pins the pips to the floor of the tile whether the status ran to
    // one line or two, so the bars line up across a row. Empty (single-pet
    // households) it still holds its 4pt, keeping every tile the same height.
    pipRow: { flexDirection: "row", gap: 3, marginTop: "auto", height: 4 },
    pip: { flex: 1, height: 4, borderRadius: 2 },
    calendar: {
      position: "absolute",
      top: 10,
      right: 10,
      zIndex: 3,
      elevation: 3,
      width: 32,
      height: 32,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.sep,
    },
    coinPop: {
      position: "absolute",
      top: 8,
      right: 50,
      zIndex: 4,
      elevation: 4,
      borderRadius: radius.full,
      backgroundColor: colors.orangeSoft,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    coinPopLabel: { fontSize: 12, fontFamily: font.bold, color: colors.orange },
  });
