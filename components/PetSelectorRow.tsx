import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, LayoutChangeEvent, Platform, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import PetAvatar from "@/components/PetAvatar";
import { PressableScale } from "@/components/ui";
import { hapticsEnabled, useReduceMotion } from "@/lib/a11y";
import type { Pet } from "@/lib/data";
import { font, radius, useColors, withAlpha, type Colors } from "@/lib/theme";

/** Ideal gap between neighbouring pets. Squeezed for big herds — see `spread`. */
const SLOT = 92;
/** The visible tile inside a slot (avatar disc + name). */
const TILE = 76;
const REEL_H = 88;
const ADD_ZONE = 64;
/** Hold this long on a pet to jump to its profile instead of selecting it. */
const PROFILE_HOLD_MS = 500;
/** One full re-order. Halved for the pet that wraps around the ends. */
const ROTATE_MS = 320;
const EASE = Easing.bezier(0.22, 1, 0.36, 1);

/**
 * The selected pet's slot — fixed by the HERD SIZE, not by which pet is
 * selected. One pet centers alone; with an even herd the extra neighbour goes
 * on the left, with an odd herd the neighbours split evenly:
 *
 *   1 pet → (sel)          2 → [a](sel)        3 → [a](sel)[b]
 *   4 → [a][b](sel)[c]     5 → [a][b](sel)[c][d]
 */
const centerSlot = (count: number) => Math.ceil((count - 1) / 2);

/**
 * Pet selector — the centered pet IS the selection, and the reel ROTATES so the
 * selection always lands on `centerSlot` (above), dead center of the page, for
 * every herd size. Used identically on Logs, Care and Pets.
 *
 * WHY THERE IS NO SCROLLVIEW HERE. The obvious build — a snapping horizontal
 * ScrollView whose children are re-ordered, then re-pinned to the center offset
 * — cannot be made smooth: re-ordering the children is a React commit and
 * moving the offset is an imperative `scrollTo`, and nothing sequences those
 * two into one frame. Every rotation showed the row at the old order with the
 * new offset (or the reverse) for a frame or three. That is jitter you can only
 * fix by removing the race, not by tuning it.
 *
 * So position is owned outright instead. Tiles are absolutely positioned over
 * the card's center line and each animates its own `slot` — a signed distance
 * from center, in slots — with Reanimated: one interruptible timing per pet,
 * entirely on the UI thread, no React commit in the loop. A rotation is then
 * just "every pet slides one slot over", which is smooth by construction, and
 * interrupting it mid-flight (tapping again) retargets from wherever each tile
 * currently is rather than restarting.
 *
 * The one pet that can't simply slide is the one whose new slot is on the far
 * side of the row. It doesn't fly back across all the others — it carries on
 * off its near edge, fades out, and fades back in from the opposite edge, so
 * the herd reads as a continuous ring. See `PetTile`.
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
  const router = useRouter();
  // Seeded from the window so the very first paint is already at the right
  // spacing; the measured value only ever corrects it by a pixel or two.
  const [cardW, setCardW] = useState(Dimensions.get("window").width - 32);

  const count = pets.length;
  const center = centerSlot(count);

  const selectedIndex = useMemo(() => {
    const i = pets.findIndex((p) => p.id === selectedId);
    return i >= 0 ? i : 0;
  }, [pets, selectedId]);

  /**
   * Pixels between neighbouring pets: `SLOT` whenever the herd fits, otherwise
   * squeezed so the outermost pet still peeks in at the card's edge instead of
   * sitting entirely off it. `center` is always the longer of the two arms, so
   * it alone sets the bound.
   */
  const spread = useMemo(
    () => (center === 0 ? SLOT : Math.min(SLOT, (cardW / 2 - 30) / center)),
    [cardW, center]
  );

  const fireHaptic = useCallback(() => {
    if (reduceMotion || !hapticsEnabled()) return;
    if (Platform.OS === "ios") Haptics.selectionAsync();
  }, [reduceMotion]);

  const select = useCallback(
    (petId: string) => {
      if (petId === selectedId) return;
      fireHaptic();
      onSelect(petId);
    },
    [selectedId, onSelect, fireHaptic]
  );

  /** Step the ring by one — what a horizontal flick does. */
  const step = useCallback(
    (dir: 1 | -1) => {
      if (count < 2) return;
      const next = pets[(selectedIndex + dir + count) % count];
      if (next) select(next.id);
    },
    [pets, selectedIndex, count, select]
  );

  const openProfile = useCallback(
    (petId: string) => {
      if (!reduceMotion && hapticsEnabled() && Platform.OS === "ios") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      router.push(`/pet/${petId}`);
    },
    [router, reduceMotion]
  );

  // Flick left/right to step the ring. The offset thresholds stop this stealing
  // the page's vertical scroll, or a tap that was meant for a tile.
  const flick = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-14, 14])
        .failOffsetY([-10, 10])
        .onEnd((e) => {
          if (Math.abs(e.translationX) < 24 && Math.abs(e.velocityX) < 320) return;
          runOnJS(step)(e.translationX < 0 ? 1 : -1);
        }),
    [step]
  );

  const onCardLayout = (e: LayoutChangeEvent) => setCardW(e.nativeEvent.layout.width);

  if (count === 0) return null;

  return (
    <View style={styles.card} onLayout={onCardLayout}>
      <GestureDetector gesture={flick}>
        <View style={styles.reel}>
          {pets.map((p, j) => {
            // The slot this pet occupies, as a signed distance from the center
            // one. The selected pet is 0 by construction; everyone else keeps
            // their place in the ring around it.
            const target = (((j - selectedIndex + center) % count) + count) % count - center;
            return (
              <PetTile
                key={p.id}
                pet={p}
                target={target}
                span={count}
                spread={spread}
                reduceMotion={reduceMotion}
                onPress={() => select(p.id)}
                onHold={() => openProfile(p.id)}
              />
            );
          })}
        </View>
      </GestureDetector>
      {onAdd ? (
        // Floats OVER the reel's right edge rather than taking a lane of its
        // own — a lane would shift the reel's centre left of the page's centre
        // by half its width, which is the whole thing being centered here.
        <View style={styles.addZone} pointerEvents="box-none">
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

/**
 * One pet, absolutely centered on the card and pushed out to its slot by
 * `translateX`. Owns its own position value, so a re-order never re-renders
 * anything: only `target` changes, and the effect below hands the move
 * straight to the UI thread.
 */
function PetTile({
  pet,
  target,
  span,
  spread,
  reduceMotion,
  onPress,
  onHold,
}: {
  pet: Pet;
  /** Destination slot, signed distance from center. */
  target: number;
  /** Herd size — half of it is the wrap threshold. */
  span: number;
  /** Pixels per slot. */
  spread: number;
  reduceMotion: boolean;
  onPress: () => void;
  onHold: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const slot = useSharedValue(target);
  const fade = useSharedValue(1);
  const prev = useRef(target);

  useEffect(() => {
    const from = prev.current;
    prev.current = target;
    if (from === target) return;
    if (reduceMotion) {
      slot.value = target;
      fade.value = 1;
      return;
    }
    // A move longer than half the ring means the short way round is off the
    // near edge and back in from the far one — sliding straight there would
    // sweep this pet across every other tile.
    if (Math.abs(target - from) <= span / 2) {
      slot.value = withTiming(target, { duration: ROTATE_MS, easing: EASE });
      return;
    }
    const dir = target > from ? -1 : 1;
    const half = ROTATE_MS / 2;
    slot.value = withSequence(
      // Out past the near edge…
      withTiming(from + dir, { duration: half, easing: Easing.in(Easing.quad) }),
      // …cut, while invisible, to just outside the far edge…
      withTiming(target - dir, { duration: 0 }),
      // …and back in to the slot it was headed for.
      withTiming(target, { duration: half, easing: Easing.out(Easing.quad) })
    );
    fade.value = withSequence(
      withTiming(0, { duration: half, easing: Easing.in(Easing.quad) }),
      withTiming(1, { duration: half, easing: Easing.out(Easing.quad) })
    );
  }, [target, span, reduceMotion, slot, fade]);

  const anim = useAnimatedStyle(() => {
    const x = slot.value * spread;
    if (reduceMotion) return { transform: [{ translateX: x }], opacity: fade.value };
    const d = Math.abs(slot.value);
    return {
      transform: [{ translateX: x }],
      opacity: interpolate(d, [0, 1, 2], [1, 0.6, 0.36], Extrapolation.CLAMP) * fade.value,
    };
  });

  // Scale rides the avatar alone, never the tile: scaling the tile would also
  // scale the name, rendering the selected pet's label at a fractional point
  // size (blurry, and a different size to every other label in the app).
  const avatarAnim = useAnimatedStyle(() => {
    if (reduceMotion) return { transform: [{ scale: 1 }] };
    return {
      transform: [{ scale: interpolate(Math.abs(slot.value), [0, 1], [1.14, 0.84], Extrapolation.CLAMP) }],
    };
  });

  // Only the centered pet's name stays legible — with a squeezed spread the
  // neighbours' labels would otherwise run into one another.
  const nameAnim = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(slot.value), [0, 0.6], [1, 0], Extrapolation.CLAMP),
  }));

  const selected = target === 0;

  return (
    // zIndex rather than render order: re-sorting the children array to paint
    // the centered pet last would detach and re-attach native views mid-flight.
    <Animated.View style={[styles.tile, { zIndex: span - Math.abs(target) }, anim]} pointerEvents="box-none">
      <PressableScale
        haptic
        onPress={onPress}
        onLongPress={onHold}
        delayLongPress={PROFILE_HOLD_MS}
        accessibilityRole="button"
        accessibilityLabel={pet.name}
        accessibilityHint={`Hold to open ${pet.name}'s profile`}
        accessibilityState={{ selected }}
        overflowsBounds
      >
        <View style={styles.item}>
          <Animated.View style={[styles.avatarWrap, selected ? styles.avatarSelected : styles.avatarUnselected, avatarAnim]}>
            <PetAvatar pet={pet} size="md" />
          </Animated.View>
          <Animated.Text numberOfLines={1} style={[styles.name, selected ? styles.nameSelected : null, nameAnim]}>
            {pet.name}
          </Animated.Text>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    card: {
      marginTop: 12,
      borderRadius: radius.md,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.sep,
      paddingVertical: 14,
      overflow: "hidden",
    },
    reel: { height: REEL_H },
    // Stretched to all four edges so the tile's own centre IS the card's centre
    // — translateX is then a pure offset from the middle of the page, and the
    // tile stays vertically centred without the reel having to size to it
    // (absolute children ignore the parent's justifyContent).
    tile: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
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
      position: "absolute",
      right: 0,
      top: 0,
      bottom: 0,
      width: ADD_ZONE,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
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
