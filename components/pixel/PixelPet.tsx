import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { cosmetic, type Pet } from "@/lib/data";
import PixelSprite from "./PixelSprite";
import { headSpriteForPet } from "./breedSprites";
import { COSMETIC_SPRITES, placementFor, type CosmeticSprite } from "./cosmeticSprites";

/**
 * The pet's currently-equipped cosmetics that have a pixel sprite, in slot order.
 * Shared by PixelPet (2D badge) and Pet3D so both place cosmetics from one source.
 */
export function equippedCosmetics(pet: Pet): { id: string; cos: CosmeticSprite }[] {
  return Object.values(pet.equipped)
    .map((id) => (id ? { id, cos: COSMETIC_SPRITES[id] } : null))
    .filter((x): x is { id: string; cos: CosmeticSprite } => !!x && !!x.cos);
}

// Floor so face/hat/etc. items stay legible on small avatar badges (list rows
// use PetAvatar's xs/sm sizes), which would otherwise scale cosmetics down to
// illegible specks.
const MIN_COSMETIC_PX = 14;

/** Gentle arcade idle wobble — pet world only, never UI chrome. */
function IdleWrap({ size, children }: { size: number; children: React.ReactNode }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
  }, [t]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: t.value * -size * 0.03 }, { rotate: `${(t.value - 0.5) * 2.4}deg` }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/**
 * Renders a pet as a pixel-art sprite with equipped cosmetics layered on top,
 * positioned by each cosmetic's `place` (fractions of the pet box).
 */
export default function PixelPet({
  pet,
  size,
  idle = false,
  showCosmetics = true,
}: {
  pet: Pet;
  size: number;
  idle?: boolean;
  showCosmetics?: boolean;
}) {
  const sprite = headSpriteForPet(pet);
  const equipped = showCosmetics ? equippedCosmetics(pet) : [];

  const body = (
    <View style={{ position: "relative", width: size, height: size }}>
      <PixelSprite sprite={sprite} size={size} />
      {equipped.map(({ id, cos }) => {
        const place = placementFor(cos, pet.species);
        const cosSize = Math.max(size * place.widthFrac, MIN_COSMETIC_PX);
        return (
          <PixelSprite
            key={id}
            sprite={cos.sprite}
            size={cosSize}
            style={{ position: "absolute", left: size * place.left, top: size * place.top }}
          />
        );
      })}
    </View>
  );
  return idle ? <IdleWrap size={size}>{body}</IdleWrap> : body;
}

/** Small preview of a single cosmetic sprite for the shop grid. */
export function PixelCosmetic({ id, size }: { id: string; size: number }) {
  const cos = COSMETIC_SPRITES[id];
  const item = cosmetic(id);
  if (!cos) return <Text style={{ fontSize: size * 0.7 }}>{item?.emoji}</Text>;
  return <PixelSprite sprite={cos.sprite} size={size} />;
}
