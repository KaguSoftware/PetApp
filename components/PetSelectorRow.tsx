import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Dimensions, LayoutChangeEvent, Platform, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import PetAvatar from "@/components/PetAvatar";
import { PressableScale } from "@/components/ui";
import { hapticsEnabled, useReduceMotion } from "@/lib/a11y";
import type { Pet } from "@/lib/data";
import { font, radius, useColors, withAlpha, type Colors } from "@/lib/theme";

/** Ideal gap between neighbouring pets. Squeezed on narrow cards — see `spread`. */
const SLOT = 92;
/** The visible tile inside a slot (avatar disc + name). */
const TILE = 76;
const REEL_H = 88;
const ADD_ZONE = 64;
/** Hold this long on a pet to jump to its profile instead of selecting it. */
const PROFILE_HOLD_MS = 500;
/** Landing animation after a flick has coasted to a stop, or after a tap. */
const SETTLE_MS = 220;
const EASE = Easing.bezier(0.22, 1, 0.36, 1);
/**
 * Neighbours drawn per side. Past this a tile is fully transparent, which is
 * what makes the ring's seam invisible — see `RING_MIN` and `wrapSlot`.
 */
const REACH = 2;
/**
 * Smallest ring we will lay out. The seam — the single point where a tile
 * teleports from one end of the ring to the other — sits at ±ringSize/2 slots,
 * so a ring of 4 puts it at ±2, exactly where tiles have already faded to zero.
 * Herds of 2 and 3 therefore get each pet rendered twice; nobody ever sees the
 * copy, because the copy only exists out past the fade.
 */
const RING_MIN = 4;

/** Signed distance around a ring of `ring` slots, in (-ring/2, ring/2]. */
function wrapSlot(x: number, ring: number) {
  "worklet";
  const half = ring / 2;
  return (((x + half) % ring) + ring) % ring - half;
}

/**
 * Pet selector — the centered pet IS the selection, and the reel is a
 * continuous ring you drag with your finger. Used identically on Logs, Care,
 * Pets and Medications.
 *
 * WHY THERE IS NO SCROLLVIEW HERE. The obvious build — a snapping horizontal
 * ScrollView whose children are re-ordered, then re-pinned to the center offset
 * — cannot be made smooth: re-ordering the children is a React commit and
 * moving the offset is an imperative `scrollTo`, and nothing sequences those
 * two into one frame. Every rotation showed the row at the old order with the
 * new offset (or the reverse) for a frame or three. That is jitter you can only
 * fix by removing the race, not by tuning it.
 *
 * So position is owned outright instead. ONE shared value, `offset`, is the
 * reel's rotation measured in slots; every tile derives its own position from
 * it on the UI thread as `wrapSlot(i - offset)`. Dragging writes `offset`
 * directly, so the reel tracks the finger exactly; letting go hands it to
 * `withDecay`, so a flick spins on past several pets and coasts to a stop
 * before snapping onto whichever one it landed nearest. Because the position
 * function is modular, the ring is infinite by construction — no re-ordering,
 * no React commit in the loop, and the wrap is a plain consequence of the
 * modulo rather than a special case that has to be animated around.
 *
 * React only hears about the result once, when the reel settles.
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
  /**
   * Overrides what the pinned "+" does. It is always shown; without this it
   * pushes the add-a-pet flow, which is what every screen wants.
   */
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

  /**
   * The ring. One entry per rendered tile; `pets[i % count]` is who it shows.
   * Herds of 2 and 3 repeat so the ring is at least `RING_MIN` long.
   */
  const ring = useMemo(() => {
    if (count === 0) return [] as { pet: Pet; key: string }[];
    const copies = count === 1 ? 1 : Math.max(1, Math.ceil(RING_MIN / count));
    return Array.from({ length: count * copies }, (_, i) => ({
      pet: pets[i % count],
      key: `${pets[i % count].id}:${Math.floor(i / count)}`,
    }));
  }, [pets, count]);
  const ringSize = ring.length;

  const selectedIndex = useMemo(() => {
    const i = pets.findIndex((p) => p.id === selectedId);
    return i >= 0 ? i : 0;
  }, [pets, selectedId]);

  /**
   * Pixels per slot. Bounded by `REACH` rather than by the herd size: only two
   * neighbours a side are ever drawn, so a big herd no longer squeezes the
   * whole row to fit pets that would be invisible anyway.
   */
  const spread = useMemo(() => Math.min(SLOT, (cardW / 2 - 30) / REACH), [cardW]);

  /**
   * The reel's rotation, in slots — which ring index is centered. Fractional
   * mid-drag. Not derived from `selectedIndex`: the gesture owns it, and React
   * only writes to it when the selection changes from outside (below).
   */
  const offset = useSharedValue(selectedIndex);
  const dragStart = useSharedValue(0);
  // Mirrored into shared values rather than captured from the render closure:
  // a plain JS number in these worklets forces re-serialization at exactly the
  // moment a Supabase fetch resolves, which has crashed this app before.
  const spreadSV = useSharedValue(spread);
  const ringSV = useSharedValue(ringSize);
  const alive = useSharedValue(true);

  useEffect(() => {
    spreadSV.value = spread;
  }, [spread, spreadSV]);
  useEffect(() => {
    ringSV.value = ringSize;
  }, [ringSize, ringSV]);
  useEffect(() => {
    alive.value = true;
    return () => {
      alive.value = false;
      cancelAnimation(offset);
    };
  }, [alive, offset]);

  /**
   * The pet the reel has come to rest on. Drives `zIndex` and the selected
   * ring, and is what `onSelect` was last told — so the effect below can tell
   * an outside change of `selectedId` from the echo of our own commit.
   */
  const [restIndex, setRestIndex] = useState(selectedIndex);

  const fireHaptic = useCallback(() => {
    if (reduceMotion || !hapticsEnabled()) return;
    if (Platform.OS === "ios") Haptics.selectionAsync();
  }, [reduceMotion]);

  /** Called once the reel lands — the only place React hears about a rotation. */
  const commit = useCallback(
    (ringIndex: number) => {
      if (count === 0) return;
      const i = ((ringIndex % count) + count) % count;
      setRestIndex(i);
      const pet = pets[i];
      if (pet && pet.id !== selectedId) onSelect(pet.id);
    },
    [pets, count, selectedId, onSelect]
  );

  /** One click per pet the reel passes, so a spin feels like a wheel. */
  useAnimatedReaction(
    () => Math.round(offset.value),
    (now, before) => {
      if (before !== null && now !== before && alive.value) runOnJS(fireHaptic)();
    },
    [fireHaptic]
  );

  /** Rotate to a ring index the short way round, then commit. */
  const rotateTo = useCallback(
    (ringIndex: number) => {
      cancelAnimation(offset);
      const target = offset.value + wrapSlot(ringIndex - offset.value, ringSize);
      if (reduceMotion) {
        offset.value = target;
        commit(ringIndex);
        return;
      }
      offset.value = withTiming(target, { duration: SETTLE_MS, easing: EASE }, (finished) => {
        "worklet";
        if (finished && alive.value) runOnJS(commit)(ringIndex);
      });
    },
    [offset, ringSize, reduceMotion, commit, alive]
  );

  /** The ring index of `petIndex` that is nearest the reel's current rotation. */
  const nearestRingIndex = useCallback(
    (petIndex: number) => {
      let best = petIndex;
      let bestD = Infinity;
      for (let i = petIndex; i < ringSize; i += count) {
        const d = Math.abs(wrapSlot(i - offset.value, ringSize));
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return best;
    },
    [ringSize, count, offset]
  );

  const select = useCallback(
    (petIndex: number) => {
      if (petIndex === restIndex) return;
      fireHaptic();
      rotateTo(nearestRingIndex(petIndex));
    },
    [restIndex, fireHaptic, rotateTo, nearestRingIndex]
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

  // Selection changed from outside the reel — a tab mount, a deleted pet, a
  // deep link. Spin to it the short way; ignore the echo of our own commit.
  useEffect(() => {
    if (count === 0 || selectedIndex === restIndex) return;
    rotateTo(nearestRingIndex(selectedIndex));
    // rotateTo/nearestRingIndex are stable per render; restIndex is the guard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, count, ringSize]);

  /**
   * Drag tracks the finger 1:1; release hands the reel to `withDecay` so a
   * flick coasts across several pets, then snaps onto the nearest one. There is
   * no rubber-banding at the ends because a ring has no ends.
   */
  const pan = useMemo(
    () =>
      Gesture.Pan()
        // Keeps the reel from stealing the page's vertical scroll, or a tap
        // that was meant for a tile.
        .activeOffsetX([-14, 14])
        .failOffsetY([-10, 10])
        .enabled(count > 1)
        .onBegin(() => {
          cancelAnimation(offset);
          dragStart.value = offset.value;
        })
        .onUpdate((e) => {
          offset.value = dragStart.value - e.translationX / spreadSV.value;
        })
        .onEnd((e) => {
          const land = (finished?: boolean) => {
            "worklet";
            if (!finished || !alive.value) return;
            const target = Math.round(offset.value);
            // Modular, so folding the rotation back down is invisible — and it
            // stops `offset` drifting off after a long session.
            const ring = ringSV.value;
            const folded = ((target % ring) + ring) % ring;
            if (reduceMotion) {
              offset.value = folded;
              runOnJS(commit)(target);
              return;
            }
            offset.value = withTiming(target, { duration: SETTLE_MS, easing: EASE }, (done) => {
              "worklet";
              if (done && alive.value) {
                offset.value = folded;
                runOnJS(commit)(target);
              }
            });
          };
          if (reduceMotion) {
            land(true);
            return;
          }
          offset.value = withDecay(
            { velocity: -e.velocityX / spreadSV.value, deceleration: 0.992 },
            land
          );
        }),
    [count, offset, dragStart, spreadSV, ringSV, alive, reduceMotion, commit]
  );

  const onCardLayout = (e: LayoutChangeEvent) => setCardW(e.nativeEvent.layout.width);

  if (count === 0) return null;

  return (
    <View style={styles.card} onLayout={onCardLayout}>
      <GestureDetector gesture={pan}>
        <View style={styles.reel}>
          {ring.map((entry, i) => (
            <PetTile
              key={entry.key}
              pet={entry.pet}
              index={i}
              offset={offset}
              ringSize={ringSize}
              spread={spread}
              reduceMotion={reduceMotion}
              // Painted back-to-front from wherever the reel is resting. Only
              // recomputed on settle, never per frame.
              zIndex={ringSize - Math.abs(wrapSlot(i - restIndex, ringSize))}
              selected={i % count === restIndex}
              onPress={() => select(i % count)}
              onHold={() => openProfile(entry.pet.id)}
            />
          ))}
        </View>
      </GestureDetector>
      {/* Pinned to the far right, on top of the reel rather than in a lane of
          its own — a lane would shift the reel's centre left of the page's
          centre by half its width, which is the whole thing being centered
          here. Opaque, so tiles rotating past simply disappear behind it. */}
      <View style={styles.addZone} pointerEvents="box-none">
        <PressableScale
          haptic
          onPress={onAdd ?? (() => router.push("/pet/new"))}
          accessibilityRole="button"
          accessibilityLabel="Add a pet"
        >
          <View style={styles.addCircle}>
            <Text style={styles.addGlyph}>+</Text>
          </View>
        </PressableScale>
      </View>
    </View>
  );
}

/**
 * One pet, absolutely centered on the card and pushed out to its slot by
 * `translateX`. Reads the reel's rotation straight off the shared value, so a
 * drag never re-renders anything.
 */
function PetTile({
  pet,
  index,
  offset,
  ringSize,
  spread,
  reduceMotion,
  zIndex,
  selected,
  onPress,
  onHold,
}: {
  pet: Pet;
  /** This tile's fixed position in the ring. */
  index: number;
  /** The reel's rotation, in slots. */
  offset: SharedValue<number>;
  ringSize: number;
  /** Pixels per slot. */
  spread: number;
  reduceMotion: boolean;
  zIndex: number;
  selected: boolean;
  onPress: () => void;
  onHold: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const anim = useAnimatedStyle(() => {
    const slot = wrapSlot(index - offset.value, ringSize);
    const d = Math.abs(slot);
    return {
      transform: [{ translateX: slot * spread }],
      // Hits zero at REACH, which is at or inside the ring's seam — that is
      // what makes the wrap invisible rather than a pop.
      opacity: interpolate(d, [0, 1, REACH - 0.4, REACH], [1, 0.62, 0.22, 0], Extrapolation.CLAMP),
    };
  });

  // Scale rides the avatar alone, never the tile: scaling the tile would also
  // scale the name, rendering the selected pet's label at a fractional point
  // size (blurry, and a different size to every other label in the app).
  const avatarAnim = useAnimatedStyle(() => {
    if (reduceMotion) return { transform: [{ scale: 1 }] };
    const d = Math.abs(wrapSlot(index - offset.value, ringSize));
    return { transform: [{ scale: interpolate(d, [0, 1], [1.14, 0.84], Extrapolation.CLAMP) }] };
  });

  // Only the centered pet's name stays legible — with a squeezed spread the
  // neighbours' labels would otherwise run into one another.
  const nameAnim = useAnimatedStyle(() => {
    const d = Math.abs(wrapSlot(index - offset.value, ringSize));
    return { opacity: interpolate(d, [0, 0.6], [1, 0], Extrapolation.CLAMP) };
  });

  return (
    // zIndex rather than render order: re-sorting the children array to paint
    // the centered pet last would detach and re-attach native views mid-flight.
    <Animated.View style={[styles.tile, { zIndex }, anim]} pointerEvents="box-none">
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
          <Animated.View
            style={[styles.avatarWrap, selected ? styles.avatarSelected : styles.avatarUnselected, avatarAnim]}
          >
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
