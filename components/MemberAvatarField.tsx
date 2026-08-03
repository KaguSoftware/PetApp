import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { InitialAvatar } from "@/components/PetAvatar";
import { FieldLabel, PressableScale, PRESS_SCALE_SMALL } from "@/components/ui";
import { DEFAULT_MEMBER_EMOJI, MEMBER_GRADIENTS, MEMBER_ICONS, sameGradient } from "@/lib/memberCard";
import { radius, useColors, type Colors } from "@/lib/theme";

const TILE = 46;
/** 2pt ring + 3pt gap around a TILE-wide avatar. */
const RING = TILE + 10;

/** One selectable avatar, drawn exactly as it will appear on the card. */
function Option({
  selected,
  label,
  onPress,
  children,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <PressableScale
      scaleTo={PRESS_SCALE_SMALL}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <View style={[styles.ring, selected && { borderColor: colors.accent }]}>{children}</View>
    </PressableScale>
  );
}

/**
 * The look of a family card: which icon sits on the avatar and which gradient
 * sits behind it.
 *
 * Every swatch renders through the real `InitialAvatar`, so the grid IS the
 * preview — the tile you tap is pixel-for-pixel what shows up on the members
 * list, the activity feed and the pet page. The first icon option is the
 * person's initial, which is what an untouched card shows.
 */
export default function MemberAvatarField({
  name,
  emoji,
  gradient,
  onChangeEmoji,
  onChangeGradient,
}: {
  name: string;
  emoji: string;
  gradient: [string, string];
  onChangeEmoji: (emoji: string) => void;
  onChangeGradient: (gradient: [string, string]) => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  // Anything outside MEMBER_ICONS (including the '🧑' the join RPCs seed) is
  // "no icon", so the initial tile is the one that reads as selected.
  const usesInitial = !MEMBER_ICONS.some((i) => i.emoji === emoji);
  const initialName = name.trim() || "?";
  // A card minted by the join/create RPCs carries an `oklch(...)` gradient that
  // safeGradient can't parse, so it arrives as the fallback accent pair — not
  // one of the palette options, which would leave the whole row looking
  // unselected. Keep that starting color as a swatch. Captured once on mount so
  // picking a palette color doesn't make the original vanish mid-edit.
  const [swatches] = useState<[string, string][]>(() =>
    MEMBER_GRADIENTS.some((g) => sameGradient(g, gradient)) ? MEMBER_GRADIENTS : [gradient, ...MEMBER_GRADIENTS]
  );

  return (
    <View>
      <FieldLabel>Icon</FieldLabel>
      <View style={styles.grid}>
        <Option
          selected={usesInitial}
          label={`Use the letter ${initialName.charAt(0).toUpperCase()}`}
          onPress={() => onChangeEmoji(DEFAULT_MEMBER_EMOJI)}
        >
          <InitialAvatar name={initialName} gradient={gradient} size={TILE} />
        </Option>
        {MEMBER_ICONS.map((opt) => (
          <Option
            key={opt.emoji}
            selected={emoji === opt.emoji}
            label={opt.label}
            onPress={() => onChangeEmoji(opt.emoji)}
          >
            <InitialAvatar name={initialName} gradient={gradient} size={TILE} emoji={opt.emoji} />
          </Option>
        ))}
      </View>

      <FieldLabel>Color</FieldLabel>
      <View style={styles.grid}>
        {swatches.map((g, i) => (
          <Option
            key={g.join()}
            selected={sameGradient(g, gradient)}
            label={`Color ${i + 1}`}
            onPress={() => onChangeGradient(g)}
          >
            <InitialAvatar name={initialName} gradient={g} size={TILE} emoji={emoji} />
          </Option>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    // The ring is always drawn (transparent when unselected) so selecting a
    // tile can't reflow the grid.
    ring: {
      width: RING,
      height: RING,
      borderRadius: radius.full,
      borderWidth: 2,
      borderColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
    },
  });
