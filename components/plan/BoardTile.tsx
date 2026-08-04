import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon, type IconName } from "@/components/Icons";
import { PressableScale } from "@/components/ui";
import { font, radius, useColors, withAlpha, type Colors } from "@/lib/theme";

/**
 * A panel on the Care board.
 *
 * The board is read by position and colour, not by reading. So a tile carries
 * exactly one hue, fills with it rather than sitting on a white card, and puts
 * its *value* on top with its *name* at the floor — a stat board, scanned, not
 * a list, read. Sizes are the ranking: the plan is a full-width hero, the
 * things you open once a month are half that. Nothing here is the same size as
 * anything else on purpose.
 *
 * The whole panel is the button. Where a tile has a second, rarer intent it
 * rides in the corner as a 30pt chip — a sibling of the pressable, never a
 * child, because a nested pressable loses its taps to the parent on Android.
 */
export default function BoardTile({
  tint,
  wash,
  minHeight,
  flex,
  label,
  caption,
  captionTint,
  corner,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  children,
}: {
  /** The tile's one colour: borders, numerals, glyph. */
  tint: string;
  /** Its fill — the matching theme-tuned soft token. */
  wash: string;
  minHeight: number;
  /** Share of the row. Omit for a full-width tile. */
  flex?: number;
  label: string;
  caption?: string;
  captionTint?: string;
  /** The rarer second intent, at a fraction of the body's weight. */
  corner?: { icon: IconName; onPress: () => void; accessibilityLabel: string };
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  /** The value: a numeral, a row of faces, a glyph. */
  children: React.ReactNode;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={flex != null ? { flex } : undefined}>
      <PressableScale
        haptic
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      >
        <View style={[styles.tile, { minHeight, backgroundColor: wash, borderColor: withAlpha(tint, 0.22) }]}>
          <View style={styles.value}>{children}</View>
          <Text numberOfLines={1} style={styles.label}>
            {label}
          </Text>
          {caption ? (
            <Text numberOfLines={2} style={[styles.caption, captionTint ? { color: captionTint } : null]}>
              {caption}
            </Text>
          ) : null}
        </View>
      </PressableScale>

      {corner ? (
        <Pressable
          onPress={corner.onPress}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={corner.accessibilityLabel}
          style={({ pressed }) => [styles.corner, { borderColor: withAlpha(tint, 0.3) }, pressed && { opacity: 0.5 }]}
        >
          <Icon name={corner.icon} size={16} color={tint} strokeWidth={2.2} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** The big number a stat tile leads with, with its unit trailing at body size. */
export function TileFigure({ value, unit, tint }: { value: string; unit?: string; tint: string }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.figureRow}>
      <Text numberOfLines={1} style={[styles.figure, { color: tint }]}>
        {value}
      </Text>
      {unit ? <Text style={styles.unit}>{unit}</Text> : null}
    </View>
  );
}

/** The tiles with nothing to count lead with their glyph instead. */
export function TileGlyph({ icon, tint }: { icon: IconName; tint: string }) {
  return <Icon name={icon} size={30} color={tint} strokeWidth={1.9} />;
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    // No shadow and no white card: the board is flat colour on the page, which
    // is what makes it scannable as a whole rather than as a stack of objects.
    tile: {
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 15,
      overflow: "hidden",
    },
    // `auto` on the label pins the name to the floor whatever the value's
    // height, so names line up across a row.
    value: { marginBottom: 12 },
    label: { marginTop: "auto", fontSize: 17, fontFamily: font.semibold, letterSpacing: -0.25, color: colors.label },
    caption: { marginTop: 2, fontSize: 12.5, fontFamily: font.medium, lineHeight: 16, color: colors.label2 },
    figureRow: { flexDirection: "row", alignItems: "baseline", gap: 5 },
    figure: { fontSize: 34, fontFamily: font.bold, letterSpacing: -1.4 },
    unit: { fontSize: 13, fontFamily: font.semibold, color: colors.label2 },
    corner: {
      position: "absolute",
      top: 12,
      right: 12,
      zIndex: 3,
      elevation: 3,
      width: 30,
      height: 30,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
    },
  });
