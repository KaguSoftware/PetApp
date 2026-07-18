import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import type { Pet } from "@/lib/data";
import { cardShadow, withAlpha } from "@/lib/theme";
import PixelSprite from "./PixelSprite";
import { equippedCosmetics } from "./PixelPet";
import { CAT_BODY_SPRITE, DOG_BODY_SPRITE } from "./petBodySprites";
import { CAT_FUR, DOG_FUR, furSprite } from "./petSprites";

/**
 * "Fake 3D" pet, ported from the web's CSS-3D card: the full-body pixel sprite
 * sits on a perspective-transformed card. Dragging tilts it (rotateX/rotateY);
 * on release the pose is held ~2.5s, then eases back to front-facing.
 */
const HOLD_MS = 2500;
const MAX_X = 12; // deg of rotateX tilt
const MAX_Y = 24; // deg of rotateY spin (web keeps Y at 2x the X range)

/** Matches the web stage's soft plum ground shadow (theme cardShadow hue). */
const GROUND_SHADOW = withAlpha(cardShadow.shadowColor, 0.22);
const BACK_PLATE = withAlpha("#4a4770", 0.25);

export default function Pet3D({ pet, size }: { pet: Pet; size: number }) {
  const rotX = useSharedValue(0);
  const rotY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  // Web mapping: a drag across the card sweeps the full ±MAX range.
  const factor = size / (MAX_X * 2);

  const pan = Gesture.Pan()
    .onBegin(() => {
      cancelAnimation(rotX);
      cancelAnimation(rotY);
      startX.value = rotX.value;
      startY.value = rotY.value;
    })
    .onUpdate((e) => {
      const dx = -e.translationY / factor; // vertical drag → rotateX
      const dy = e.translationX / factor; // horizontal drag → rotateY
      rotX.value = Math.max(-MAX_X, Math.min(MAX_X, startX.value + dx));
      rotY.value = Math.max(-MAX_Y, Math.min(MAX_Y, startY.value + dy));
    })
    .onFinalize(() => {
      // Hold the pose, then ease back to front-facing.
      const back = { duration: 250, easing: Easing.out(Easing.cubic) };
      rotX.value = withDelay(HOLD_MS, withTiming(0, back));
      rotY.value = withDelay(HOLD_MS, withTiming(0, back));
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: size * 3 },
      { rotateX: `${rotX.value}deg` },
      { rotateY: `${rotY.value}deg` },
    ],
  }));

  // Ground shadow reacts to tilt like the web's.
  const shadowStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: Math.abs(rotX.value) * 0.2 },
      { scaleX: 1 - Math.abs(rotY.value) / 180 },
    ],
  }));

  // The body sprite (16×24) renders at `W` wide; its top 16 rows form a W×W
  // "face box" at the sprite's top-left. Cosmetics are authored against a 16px
  // face grid, so re-anchoring their `place` fractions to that box lands hats on
  // the ears, glasses on the eyes, collars at the neck and outfits on the chest.
  const W = size * 0.55;
  const boxLeft = (size - W) / 2;
  const boxTop = (size - W * 1.5) / 2;
  const bodySprite =
    pet.species === "cat"
      ? furSprite(CAT_BODY_SPRITE, CAT_FUR.body, CAT_FUR.shade)
      : furSprite(DOG_BODY_SPRITE, DOG_FUR.body, DOG_FUR.shade);
  const cosmetics = equippedCosmetics(pet);

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={[
          styles.groundShadow,
          { width: size * 0.6, left: size * 0.2 },
          shadowStyle,
        ]}
      />
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.card, cardStyle]}>
          {/* back plate gives the sprite a hint of thickness as it turns */}
          <View style={[styles.backPlate, { left: size * 0.12, right: size * 0.12, top: size * 0.12, bottom: size * 0.12 }]} />
          <PixelSprite sprite={bodySprite} size={W} style={{ position: "absolute", left: boxLeft, top: boxTop }} />
          {cosmetics.map(({ id, cos }) => (
            <PixelSprite
              key={id}
              sprite={cos.sprite}
              size={W * cos.place.widthFrac}
              style={{
                position: "absolute",
                left: boxLeft + W * cos.place.left,
                top: boxTop + W * cos.place.top,
              }}
            />
          ))}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%", height: "100%" },
  backPlate: { position: "absolute", borderRadius: 16, backgroundColor: BACK_PLATE },
  groundShadow: {
    position: "absolute",
    bottom: 0,
    height: 12,
    borderRadius: 999,
    backgroundColor: GROUND_SHADOW,
  },
});
