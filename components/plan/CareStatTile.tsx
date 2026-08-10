import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Icon, type IconName } from "@/components/Icons";
import PetAvatar from "@/components/PetAvatar";
import { PressableScale } from "@/components/ui";
import type { Pet } from "@/lib/data";
import { font, radius, useColors, withAlpha, type Colors } from "@/lib/theme";

/** One pet's share of a tile, named in the chooser sheet a tap opens. */
export interface TilePetValue {
  pet: Pet;
  value: string;
  /** The family overrode the plan's number for this pet. */
  own?: boolean;
}

/**
 * One care item as a stat tile — the value is the hero.
 *
 * Same anatomy as the Logs dashboard's CareTile (icon chip, washed in the
 * item's hue, 2-up grid), but this board answers "what is the routine" rather
 * than "what needs doing", so instead of a status line it carries the number
 * itself, set large: 2×, 460 g, Weekly.
 *
 * Everything lives on two fixed rows — chip left and face cluster right, then
 * value over label — so every tile stands exactly the same height. Per-pet
 * numbers never print on the tile; a disagreeing household summarises
 * ("2–3×"), shows its faces, and answers in the chooser a tap opens.
 */
export default function CareStatTile({
  icon,
  tint,
  bg,
  value,
  label,
  caption,
  own = false,
  petValues,
  onPress,
}: {
  icon: IconName;
  tint: string;
  bg: string;
  /** The big figure. */
  value: string;
  label: string;
  /** Short clause folded into the label line ("15–20 min"). */
  caption?: string;
  /** The family's own number rather than the plan's — sets the value in accent. */
  own?: boolean;
  /** Present when pets carry different values — one entry per pet. */
  petValues?: TilePetValue[];
  onPress: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <PressableScale
      haptic
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        petValues ? `${label}: ${petValues.map((p) => `${p.pet.name} ${p.value}`).join(", ")}` : `${label}, ${value}`
      }
      style={styles.slot}
    >
      <View style={styles.tile}>
        <LinearGradient
          pointerEvents="none"
          colors={[withAlpha(tint, 0.13), withAlpha(tint, 0.015)]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.head}>
          <View style={[styles.chip, { backgroundColor: bg }]}>
            <Icon name={icon} size={17} color={tint} strokeWidth={2} />
          </View>
          {petValues ? (
            <View style={styles.cluster}>
              {petValues.map((p, i) => (
                <View key={p.pet.id} style={[styles.clusterFace, i > 0 && { marginLeft: -10 }]}>
                  <PetAvatar pet={p.pet} size="xs" />
                </View>
              ))}
            </View>
          ) : null}
        </View>
        <Text numberOfLines={1} style={[styles.value, own && { color: colors.accent }]}>
          {value}
        </Text>
        <Text numberOfLines={1} style={styles.label}>
          {caption ? `${label} · ${caption}` : label}
        </Text>
      </View>
    </PressableScale>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    slot: { flexBasis: "47%", flexGrow: 1 },
    tile: {
      flex: 1,
      borderRadius: radius.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.sep,
      paddingHorizontal: 14,
      paddingVertical: 12,
      overflow: "hidden",
    },
    // 32pt tall whether or not the cluster is there, so tiles can't diverge.
    head: { height: 32, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    chip: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    cluster: { flexDirection: "row", alignItems: "center" },
    // A ring of the card colour keeps overlapped faces legible against each other.
    clusterFace: { borderRadius: 999, borderWidth: 2, borderColor: colors.card },
    value: { marginTop: 9, fontSize: 22, fontFamily: font.bold, letterSpacing: -0.5, color: colors.label },
    label: { marginTop: 1, marginBottom: 2, fontSize: 13, fontFamily: font.medium, color: colors.label2 },
  });
