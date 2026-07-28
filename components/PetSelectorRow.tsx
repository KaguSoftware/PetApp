import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, Platform, StyleSheet, Text, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import PetAvatar from "@/components/PetAvatar";
import { PressableScale } from "@/components/ui";
import { hapticsEnabled, useReduceMotion } from "@/lib/a11y";
import type { Pet } from "@/lib/data";
import { font, radius, useColors, withAlpha, type Colors } from "@/lib/theme";

// Slot width (one pet's share of the reel) and the visible tile inside it —
// the gap between the two is what lets neighbours peek in from the sides.
const SLOT = 96;
const TILE = 76;
const ADD_ZONE = 64;

/**
 * Roulette-style pet selector — snaps to one pet at a time, haptic tick per
 * detent, and the centered pet IS the selection (there's no separate tap
 * target vs. highlighted state to keep in sync). Used identically on Logs,
 * Care and Pets; selection always follows the reel, never the other way
 * around — tapping an off-center pet just scrolls the reel to it.
 */
export default function PetSelectorRow({
  pets,
  selectedId,
  onSelect,
  onAdd,
}: {
  pets: Pet[];
  selectedId: string;
  onSelect: (petId: string) => void;
  /** When set, a floating "+" button (Pets tab) opens the add-a-pet flow. */
  onAdd?: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const reduceMotion = useReduceMotion();
  const scrollRef = useRef<Animated.ScrollView>(null);
  const scrollX = useSharedValue(0);
  const lastHapticIndex = useSharedValue(-1);
  // Measured off the scroll viewport itself (not the whole card) so the
  // reel centers within its own lane — the "+" button sits in a separate
  // fixed-width lane to the right and never eats into that centering math.
  const [scrollW, setScrollW] = useState(0);
  const [settledIndex, setSettledIndex] = useState(0);
  const scrollIndexRef = useRef<number | null>(null);
  const firstAlignRef = useRef(true);

  const targetIndex = useMemo(() => {
    const i = pets.findIndex((p) => p.id === selectedId);
    return i >= 0 ? i : 0;
  }, [pets, selectedId]);

  const fireHaptic = useCallback(() => {
    if (reduceMotion || !hapticsEnabled()) return;
    if (Platform.OS === "ios") Haptics.selectionAsync();
  }, [reduceMotion]);

  const commitSelection = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(pets.length - 1, idx));
      scrollIndexRef.current = clamped;
      setSettledIndex(clamped);
      const p = pets[clamped];
      if (p && p.id !== selectedId) onSelect(p.id);
    },
    [pets, selectedId, onSelect]
  );

  const scrollHandler = useAnimatedScrollHandler(
    {
      onScroll: (e) => {
        scrollX.value = e.contentOffset.x;
        const idx = Math.round(e.contentOffset.x / SLOT);
        if (idx !== lastHapticIndex.value) {
          lastHapticIndex.value = idx;
          runOnJS(fireHaptic)();
        }
      },
      onEndDrag: (e) => {
        runOnJS(commitSelection)(Math.round(e.contentOffset.x / SLOT));
      },
      onMomentumEnd: (e) => {
        runOnJS(commitSelection)(Math.round(e.contentOffset.x / SLOT));
      },
    },
    [fireHaptic, commitSelection]
  );

  // Keep the reel aligned to an externally-driven selectedId (e.g. another
  // screen deep-linking to a specific pet). Never fights a live drag.
  useEffect(() => {
    if (scrollIndexRef.current === targetIndex) return;
    scrollIndexRef.current = targetIndex;
    setSettledIndex(targetIndex);
    const animated = !firstAlignRef.current;
    firstAlignRef.current = false;
    const raf = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: targetIndex * SLOT, animated });
    });
    return () => cancelAnimationFrame(raf);
  }, [targetIndex]);

  if (pets.length === 0) return null;

  // Symmetric padding so index 0 and the last pet can both reach dead center —
  // every pet, including the ones at the ends, gets the same left/right travel.
  const sidePad = Math.max(SLOT / 2, scrollW > 0 ? (scrollW - SLOT) / 2 : SLOT);

  const onScrollWrapLayout = (e: LayoutChangeEvent) => setScrollW(e.nativeEvent.layout.width);

  return (
    <View style={styles.card}>
      <View style={styles.scrollWrap} onLayout={onScrollWrapLayout}>
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={SLOT}
          decelerationRate="fast"
          snapToAlignment="start"
          scrollEventThrottle={16}
          onScroll={scrollHandler}
          contentContainerStyle={{ paddingHorizontal: sidePad }}
        >
          {pets.map((p, i) => (
            <PetSelectorItem
              key={p.id}
              pet={p}
              index={i}
              scrollX={scrollX}
              selected={i === settledIndex}
              reduceMotion={reduceMotion}
              onPress={() => {
                if (i === scrollIndexRef.current) return;
                scrollRef.current?.scrollTo({ x: i * SLOT, animated: true });
              }}
            />
          ))}
        </Animated.ScrollView>
      </View>
      {onAdd ? (
        <View style={styles.addZone}>
          <PressableScale haptic onPress={onAdd} accessibilityRole="button" accessibilityLabel="Add a pet">
            <View style={styles.addCircle}>
              <Text style={styles.addGlyph}>+</Text>
            </View>
          </PressableScale>
        </View>
      ) : null}
    </View>
  );
}

function PetSelectorItem({
  pet,
  index,
  scrollX,
  selected,
  reduceMotion,
  onPress,
}: {
  pet: Pet;
  index: number;
  scrollX: SharedValue<number>;
  selected: boolean;
  reduceMotion: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const anim = useAnimatedStyle(() => {
    if (reduceMotion) return { transform: [{ scale: 1 }], opacity: 1 };
    const dist = Math.abs(scrollX.value / SLOT - index);
    const scale = interpolate(dist, [0, 1], [1.16, 0.86], Extrapolation.CLAMP);
    const opacity = interpolate(dist, [0, 1], [1, 0.55], Extrapolation.CLAMP);
    return { transform: [{ scale }], opacity };
  });

  return (
    <View style={styles.slot}>
      <PressableScale
        haptic
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={pet.name}
        accessibilityState={{ selected }}
        overflowsBounds
      >
        <View style={styles.item}>
          <Animated.View style={[styles.avatarWrap, selected ? styles.avatarSelected : styles.avatarUnselected, anim]}>
            <PetAvatar pet={pet} size="md" />
          </Animated.View>
          <Text numberOfLines={1} style={[styles.name, selected ? styles.nameSelected : null]}>
            {pet.name}
          </Text>
        </View>
      </PressableScale>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    card: {
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
      borderRadius: radius.md,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.sep,
      paddingVertical: 14,
      overflow: "hidden",
    },
    scrollWrap: { flex: 1 },
    slot: { width: SLOT, alignItems: "center" },
    item: { alignItems: "center", width: TILE, paddingVertical: 2 },
    avatarWrap: {
      padding: 3,
      borderRadius: 34,
      borderWidth: 2,
    },
    avatarSelected: { borderColor: colors.accent, backgroundColor: withAlpha(colors.accent, 0.08) },
    avatarUnselected: { borderColor: "transparent" },
    name: {
      marginTop: 4,
      maxWidth: TILE,
      fontSize: 13,
      fontFamily: font.medium,
      color: colors.label2,
      textAlign: "center",
    },
    nameSelected: { fontFamily: font.semibold, color: colors.label },
    addZone: {
      width: ADD_ZONE,
      alignItems: "center",
      justifyContent: "center",
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: colors.sep,
    },
    addCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: withAlpha(colors.accent, 0.1),
    },
    addGlyph: { fontSize: 22, lineHeight: 26, fontFamily: font.medium, color: colors.accent },
  });
