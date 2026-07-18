import { useCallback, useMemo, useRef } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { hapticsEnabled } from "@/lib/a11y";
import { colors, font } from "@/lib/theme";

const ITEM_HEIGHT = 44;
const VISIBLE = 5; // odd, so one row is centered under the selection band

/**
 * A single snapping wheel column — the building block. Scrolling snaps to whole
 * rows and reports the value at rest; a light haptic ticks as each row crosses
 * center (iOS, when haptics are enabled). No native dependency, so it runs in
 * Expo Go and every dev build.
 */
export function WheelColumn({
  values,
  value,
  onChange,
  format = (v) => String(v),
  width = 90,
  suffix,
}: {
  values: number[];
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  width?: number;
  suffix?: string;
}) {
  const lastIndex = useRef<number>(-1);

  const selectedIndex = useMemo(() => {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < values.length; i++) {
      const d = Math.abs(values[i] - value);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }, [values, value]);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
      if (idx !== lastIndex.current && idx >= 0 && idx < values.length) {
        lastIndex.current = idx;
        if (Platform.OS === "ios" && hapticsEnabled()) Haptics.selectionAsync();
      }
    },
    [values.length],
  );

  const onSettle = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.max(0, Math.min(values.length - 1, Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT)));
      const next = values[idx];
      if (next !== value) onChange(next);
    },
    [values, value, onChange],
  );

  const pad = (VISIBLE - 1) / 2;

  return (
    <View style={[styles.col, { width, height: ITEM_HEIGHT * VISIBLE }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: selectedIndex * ITEM_HEIGHT }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onSettle}
        onScrollEndDrag={onSettle}
        contentContainerStyle={{ paddingVertical: pad * ITEM_HEIGHT }}
      >
        {values.map((v, i) => (
          <View key={i} style={styles.item}>
            <Text style={[styles.itemText, i === selectedIndex && styles.itemTextActive]}>{format(v)}</Text>
          </View>
        ))}
      </ScrollView>
      {suffix ? (
        <Text pointerEvents="none" style={styles.suffix}>
          {suffix}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * iOS clock-style number picker split into TWO wheels: a whole-number column and
 * a decimal column (e.g. weight "12" · ".4"). The selection band spans both.
 */
export default function WheelPicker({
  whole,
  decimals,
  value,
  onChange,
  unit,
  decimalPlaces = 1,
}: {
  /** Whole-number options, e.g. [0..120]. */
  whole: number[];
  /** Decimal options as tenths etc., e.g. [0,1,...,9] for one place. */
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

  return (
    <View style={styles.wrap}>
      <View pointerEvents="none" style={styles.band} />
      <View style={styles.row}>
        <WheelColumn values={whole} value={wholePart} onChange={setWhole} width={84} />
        <Text style={styles.dot}>.</Text>
        <WheelColumn values={decimals} value={decPart} onChange={setDec} width={64} format={(v) => String(v)} />
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: "center", justifyContent: "center", height: ITEM_HEIGHT * VISIBLE },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  band: {
    position: "absolute",
    left: "50%",
    marginLeft: -130,
    width: 260,
    top: ITEM_HEIGHT * ((VISIBLE - 1) / 2),
    height: ITEM_HEIGHT,
    borderRadius: 10,
    backgroundColor: colors.fill,
  },
  col: { justifyContent: "center" },
  item: { height: ITEM_HEIGHT, alignItems: "center", justifyContent: "center" },
  itemText: { fontSize: 22, fontFamily: font.medium, color: colors.label3 },
  itemTextActive: { color: colors.label, fontFamily: font.semibold },
  dot: { fontSize: 22, fontFamily: font.bold, color: colors.label, marginHorizontal: -2 },
  unit: { fontSize: 17, fontFamily: font.medium, color: colors.label2, marginLeft: 8 },
  suffix: { position: "absolute", right: 4, top: ITEM_HEIGHT * ((VISIBLE - 1) / 2) + 12, fontSize: 15, color: colors.label2 },
});
