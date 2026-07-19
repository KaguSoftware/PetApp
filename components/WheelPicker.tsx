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

  // Align the scroll to the external value on mount and whenever it changes to a
  // row we're not already parked on — but never while the user is mid-scroll.
  useEffect(() => {
    if (scrolling.current) return;
    if (centerIndex !== targetIndex) {
      ref.current?.scrollTo({ y: targetIndex * ITEM_HEIGHT, animated: false });
      setCenterIndex(targetIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetIndex]);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.max(0, Math.min(values.length - 1, Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT)));
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

  const setWhole = (w: number) => onChange(Number((w + decPart / scale).toFixed(decimalPlaces)));
  const setDec = (d: number) => onChange(Number((wholePart + d / scale).toFixed(decimalPlaces)));

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
  unit: { fontSize: 17, fontFamily: font.medium, color: colors.label2, marginLeft: 10 },
});
