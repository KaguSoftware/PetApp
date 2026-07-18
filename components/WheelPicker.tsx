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
import { colors, font } from "@/lib/theme";

const ITEM_HEIGHT = 44;
const VISIBLE = 5; // odd, so one row is centered under the selection band

/**
 * iOS clock-style wheel picker built with a snapping ScrollView — no native
 * dependency, so it runs in Expo Go and every dev build. The centered row sits
 * under a translucent selection band; scrolling snaps to whole rows and emits
 * the value at rest. Light haptic tick as each row crosses center (iOS).
 */
export default function WheelPicker({
  values,
  value,
  onChange,
  format = (v) => String(v),
  width = 120,
}: {
  values: number[];
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  width?: number;
}) {
  const ref = useRef<ScrollView>(null);
  const lastIndex = useRef<number>(-1);

  // Nearest index to the current value (values may be fractional / stepped).
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
        if (Platform.OS === "ios") Haptics.selectionAsync();
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
    <View style={[styles.wrap, { width, height: ITEM_HEIGHT * VISIBLE }]}>
      <View pointerEvents="none" style={styles.band} />
      <ScrollView
        ref={ref}
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: "center", justifyContent: "center" },
  band: {
    position: "absolute",
    left: 0,
    right: 0,
    top: ITEM_HEIGHT * ((VISIBLE - 1) / 2),
    height: ITEM_HEIGHT,
    borderRadius: 10,
    backgroundColor: colors.fill,
  },
  item: { height: ITEM_HEIGHT, alignItems: "center", justifyContent: "center" },
  itemText: { fontSize: 20, fontFamily: font.medium, color: colors.label3 },
  itemTextActive: { color: colors.label, fontFamily: font.semibold },
});
