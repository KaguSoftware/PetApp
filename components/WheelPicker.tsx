import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { hapticsEnabled } from "@/lib/a11y";
import { colors, font } from "@/lib/theme";

const ITEM_HEIGHT = 44;
const VISIBLE = 5; // odd, so one row sits centered under the selection band
const PAD = (VISIBLE - 1) / 2;

/**
 * A single snapping wheel column. Kept UNCONTROLLED while the user scrolls to
 * avoid the feedback loop (scroll → onChange → re-render → contentOffset reset →
 * scroll jump) that made the old version jitter: the initial position is set
 * once with an imperative `scrollTo`, the centered row is tracked in local state
 * for highlighting, and `onChange` only fires when scrolling settles. An
 * external value change re-aligns the scroll only when it differs from where the
 * wheel already sits.
 */
function WheelColumn<T>({
  values,
  value,
  onChange,
  format = (v: T) => String(v),
  width,
  findIndex,
}: {
  values: T[];
  value: T;
  onChange: (v: T) => void;
  format?: (v: T) => string;
  width: number;
  /** How to map an external `value` to a row index. Defaults to exact match
   *  (used for string wheels); the numeric wheel passes a closest-distance
   *  matcher since decimal values don't always land exactly on the grid. */
  findIndex?: (values: T[], value: T) => number;
}) {
  const ref = useRef<ScrollView>(null);
  const scrolling = useRef(false);
  const lastHaptic = useRef(-1);

  const indexOf = useCallback(
    (v: T) => {
      if (findIndex) return findIndex(values, v);
      const i = values.indexOf(v);
      return i >= 0 ? i : 0;
    },
    [values, findIndex],
  );

  const targetIndex = useMemo(() => indexOf(value), [indexOf, value]);
  const [centerIndex, setCenterIndex] = useState(targetIndex);
  // Where the scroll view is actually parked. Tracked separately from
  // centerIndex (which only drives highlighting) because a mounted-but-
  // unscrolled column sits at row 0 no matter what centerIndex says.
  const scrollIndex = useRef<number | null>(null);

  // Align the scroll to the external value on mount and whenever it changes to a
  // row we're not already parked on — but never while the user is mid-scroll.
  //
  // The mount case matters: initializing centerIndex to targetIndex used to make
  // this a no-op, so a wheel opened on any value but the first rendered parked at
  // row 0 while highlighting a different row — the "insanely buggy" symptom.
  useEffect(() => {
    if (scrolling.current) return;
    if (scrollIndex.current === targetIndex) return;
    scrollIndex.current = targetIndex;
    // Defer past layout: scrollTo before the ScrollView has measured its content
    // is silently dropped on both platforms.
    //
    // The frame MUST be cancelled on unmount. A sheet that closes in the same
    // tick as this schedules leaves the callback to run against a torn-down
    // native view, which is a crash rather than a catchable JS error.
    const raf = requestAnimationFrame(() => {
      ref.current?.scrollTo({ y: targetIndex * ITEM_HEIGHT, animated: false });
    });
    setCenterIndex(targetIndex);
    return () => cancelAnimationFrame(raf);
  }, [targetIndex]);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.max(0, Math.min(values.length - 1, Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT)));
      // Keep the parked position in sync with the finger so the align effect
      // doesn't yank the wheel back mid-scroll.
      scrollIndex.current = idx;
      if (idx !== centerIndex) setCenterIndex(idx);
      if (idx !== lastHaptic.current) {
        lastHaptic.current = idx;
        if (Platform.OS === "ios" && hapticsEnabled()) Haptics.selectionAsync();
      }
    },
    [values.length, centerIndex],
  );

  const settle = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrolling.current = false;
      const idx = Math.max(0, Math.min(values.length - 1, Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT)));
      scrollIndex.current = idx;
      setCenterIndex(idx);
      const next = values[idx];
      if (next !== value) onChange(next);
    },
    [values, value, onChange],
  );

  return (
    // A wheel is often rendered inside a Sheet's own vertical ScrollView, where
    // both scrollers answer the same pan — on iOS the outer one usually wins and
    // the wheel refuses to turn. `blocksExternalGesture` makes the ancestor
    // scroll wait on this column, so the wheel gets the drag. (nestedScrollEnabled
    // below only covers the Android side of the same problem.)
    <GestureDetector gesture={Gesture.Native().blocksExternalGesture()}>
      <ScrollView
        ref={ref}
        style={{ width, height: ITEM_HEIGHT * VISIBLE }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="start"
        disableIntervalMomentum
        decelerationRate="fast"
        nestedScrollEnabled
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          scrolling.current = true;
        }}
        onScroll={onScroll}
        onMomentumScrollEnd={settle}
        onScrollEndDrag={settle}
        contentContainerStyle={{ paddingVertical: PAD * ITEM_HEIGHT }}
      >
        {values.map((v, i) => (
          <View key={i} style={styles.item}>
            <Text style={[styles.itemText, i === centerIndex && styles.itemTextActive]}>{format(v)}</Text>
          </View>
        ))}
      </ScrollView>
    </GestureDetector>
  );
}

/**
 * iOS clock-style number picker split into TWO wheels: a whole-number column and
 * a decimal column (e.g. weight "12" · "4"). A single selection band sits behind
 * both, sized to the measured row so it never drifts.
 */
export default function WheelPicker({
  whole,
  decimals,
  value,
  onChange,
  unit,
  decimalPlaces = 1,
}: {
  whole: number[];
  decimals: number[];
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  decimalPlaces?: number;
}) {
  const scale = 10 ** decimalPlaces;
  const wholePart = Math.floor(value + 1e-9);
  const decPart = Math.round((value - wholePart) * scale);

  // Compose from the two columns, then clamp into the range the columns
  // describe. Spinning the whole column to a boundary row (e.g. max 120 with a
  // leftover .7) would otherwise emit an out-of-range 120.7.
  const lo = whole.length > 0 ? whole[0] : 0;
  const hi = whole.length > 0 ? whole[whole.length - 1] + (decimals[decimals.length - 1] ?? 0) / scale : 0;
  const emit = (w: number, d: number) => {
    const composed = Number((w + d / scale).toFixed(decimalPlaces));
    const clamped = Math.min(hi, Math.max(lo, composed));
    onChange(Number(clamped.toFixed(decimalPlaces)));
  };

  const setWhole = (w: number) => emit(w, decPart);
  const setDec = (d: number) => emit(wholePart, d);

  const [rowW, setRowW] = useState(0);
  const onRowLayout = (e: LayoutChangeEvent) => setRowW(e.nativeEvent.layout.width);

  return (
    <View style={styles.wrap}>
      {/* selection band, sized to the measured content row */}
      <View pointerEvents="none" style={[styles.band, { width: rowW || "70%" }]} />
      <View style={styles.row} onLayout={onRowLayout}>
        <WheelColumn values={whole} value={wholePart} onChange={setWhole} width={80} findIndex={closestIndex} />
        <Text style={styles.dot}>.</Text>
        <WheelColumn values={decimals} value={decPart} onChange={setDec} width={56} findIndex={closestIndex} />
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

/** Snaps to the nearest value rather than requiring an exact match, since
 *  decimal rounding can put `value` slightly off the grid. */
function closestIndex(values: number[], v: number) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < values.length; i++) {
    const d = Math.abs(values[i] - v);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MERIDIEM = ["AM", "PM"];

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

/** Parse 24h "HH:MM" into wheel parts. Falls back to 9:00 AM on bad input. */
function parseTime(value: string): { hour12: number; minute: number; pm: boolean } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value?.trim() ?? "");
  const h24 = m ? Math.min(23, Number(m[1])) : 9;
  const minute = m ? Math.min(59, Number(m[2])) : 0;
  return { hour12: h24 % 12 === 0 ? 12 : h24 % 12, minute, pm: h24 >= 12 };
}

/** Wheel parts back to 24h "HH:MM". */
function toTimeString(hour12: number, minute: number, pm: boolean): string {
  const h24 = (hour12 % 12) + (pm ? 12 : 0);
  return `${pad2(h24)}:${pad2(minute)}`;
}

/**
 * iPhone clock-style time picker: hour · minute · AM/PM wheels sharing one
 * selection band. Value is 24h "HH:MM" (the CareScheduleSlot.time format), so
 * it drops into anywhere a time-of-day is edited.
 */
export function TimeWheelPicker({
  value,
  onChange,
  minuteStep = 5,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Minute granularity — 5 by default; pass 1 for exact times. */
  minuteStep?: number;
}) {
  const { hour12, minute, pm } = parseTime(value);
  const minutes = useMemo(
    () => Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep),
    [minuteStep],
  );

  const [rowW, setRowW] = useState(0);
  const onRowLayout = (e: LayoutChangeEvent) => setRowW(e.nativeEvent.layout.width);

  return (
    <View style={styles.wrap}>
      <View pointerEvents="none" style={[styles.band, { width: rowW || "70%" }]} />
      <View style={styles.row} onLayout={onRowLayout}>
        <WheelColumn
          values={HOURS_12}
          value={hour12}
          onChange={(h) => onChange(toTimeString(h, minute, pm))}
          width={58}
          findIndex={closestIndex}
        />
        <Text style={styles.colon}>:</Text>
        <WheelColumn
          values={minutes}
          value={minute}
          onChange={(mi) => onChange(toTimeString(hour12, mi, pm))}
          format={pad2}
          width={58}
          findIndex={closestIndex}
        />
        <WheelColumn
          values={MERIDIEM}
          value={pm ? "PM" : "AM"}
          onChange={(mer) => onChange(toTimeString(hour12, minute, mer === "PM"))}
          width={62}
        />
      </View>
    </View>
  );
}

/** Starting row for the frequency wheel — the most common real-world answer. */
export const DEFAULT_MED_FREQUENCY = "Once daily";

/** How often a medication is taken — the wheel values for the frequency picker. */
export const MED_FREQUENCIES = [
  "As needed",
  "Once daily",
  "Twice daily",
  "Three times daily",
  "Four times daily",
  "Every other day",
  "Weekly",
  "Every 2 weeks",
  "Monthly",
  "Every 3 months",
  "Every 6 months",
  "Yearly",
];

/**
 * Single-column wheel for picking a string out of a fixed list (e.g. breed
 * names). Shares the same snap/haptics/selection-band behavior as the
 * numeric WheelPicker above, just with one column instead of two.
 */
export function SingleWheelPicker({
  values,
  value,
  onChange,
  width = 260,
}: {
  values: string[];
  value: string;
  onChange: (v: string) => void;
  width?: number;
}) {
  const [rowW, setRowW] = useState(0);
  const onRowLayout = (e: LayoutChangeEvent) => setRowW(e.nativeEvent.layout.width);

  return (
    <View style={styles.wrap}>
      <View pointerEvents="none" style={[styles.band, { width: rowW || "70%" }]} />
      <View style={styles.row} onLayout={onRowLayout}>
        <WheelColumn values={values} value={value} onChange={onChange} width={width} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: "center", justifyContent: "center", alignItems: "center", height: ITEM_HEIGHT * VISIBLE },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", alignSelf: "center" },
  band: {
    position: "absolute",
    top: ITEM_HEIGHT * PAD,
    height: ITEM_HEIGHT,
    borderRadius: 12,
    backgroundColor: colors.fill,
  },
  item: { height: ITEM_HEIGHT, alignItems: "center", justifyContent: "center" },
  itemText: { fontSize: 22, fontFamily: font.medium, color: colors.label3 },
  itemTextActive: { color: colors.label, fontFamily: font.semibold },
  dot: { fontSize: 22, fontFamily: font.bold, color: colors.label, marginHorizontal: 2 },
  colon: { fontSize: 22, fontFamily: font.bold, color: colors.label, marginHorizontal: 1 },
  unit: { fontSize: 17, fontFamily: font.medium, color: colors.label2, marginLeft: 10 },
});
