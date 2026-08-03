import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icons";
import PixelPet from "@/components/pixel/PixelPet";
import type { Pet } from "@/lib/data";
import { memberIconFor } from "@/lib/memberCard";
import { font } from "@/lib/theme";

const SIZES = {
  xs: { px: 28, sprite: 24 },
  sm: { px: 40, sprite: 34 },
  md: { px: 56, sprite: 48 },
  lg: { px: 84, sprite: 74 },
  xl: { px: 116, sprite: 104 },
};

export default function PetAvatar({
  pet,
  size = "md",
  showCosmetics = true,
  idle = false,
}: {
  pet: Pet;
  size?: keyof typeof SIZES;
  showCosmetics?: boolean;
  idle?: boolean;
}) {
  const s = SIZES[size];
  return (
    <View style={{ width: s.px, height: s.px }}>
      {/* Background disc — the gradient bubble the pet sits in */}
      <LinearGradient
        colors={[pet.gradient[0], pet.gradient[1]]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: s.px / 2 }]}
      />
      {/* Unclipped pet layer — hats spill above the disc, matching the dress-up stage. */}
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <PixelPet pet={pet} size={s.sprite} idle={idle} showCosmetics={showCosmetics} />
      </View>
    </View>
  );
}

/**
 * Member avatar: a clean iOS-style gradient circle with the initial in Inter —
 * distinct from the round pixel pet sprites (people are not part of the pixel
 * pet world).
 *
 * `emoji` is the raw `members.emoji` column. When it matches one of the icons
 * offered in the edit-card sheet it replaces the initial with that stroke icon;
 * anything else (including the glyphs the join RPCs seed) keeps the initial.
 */
export function InitialAvatar({
  name,
  gradient,
  size = 40,
  emoji,
}: {
  name: string;
  gradient: [string, string];
  size?: number;
  emoji?: string | null;
}) {
  const icon = memberIconFor(emoji);
  return (
    <LinearGradient
      colors={[gradient[0], gradient[1]]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={[styles.center, { width: size, height: size, borderRadius: size / 2 }]}
    >
      {icon ? (
        <Icon name={icon} size={Math.round(size * 0.52)} color="#fff" strokeWidth={2.1} />
      ) : (
        <Text style={{ fontSize: size * 0.42, fontFamily: font.semibold, color: "#fff" }}>{name.charAt(0).toUpperCase()}</Text>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
});
