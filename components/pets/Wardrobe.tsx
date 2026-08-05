import { useMemo, useState } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { COIN_SPRITE } from "@/components/pixel/hudSprites";
import { PixelCosmetic } from "@/components/pixel/PixelPet";
import PixelSprite from "@/components/pixel/PixelSprite";
import { PressableScale } from "@/components/ui";
import type { Wardrobe as WardrobeDoc, WardrobeItem, WardrobeSlot } from "@/lib/wardrobe";
import { font, radius, useColors, withAlpha, type Colors } from "@/lib/theme";

const COLS = 4;
const GAP = 10;

/**
 * The wardrobe — a gallery, on the page, one chapter per slot.
 *
 * Every piece used to live behind one "Accessories" button, inside a sheet, as
 * a fifteen-strong grid of shadowed cards each carrying a preview box, a name
 * and its own pill button. Three containers deep for a thing you buy with play
 * money. It is the page now: fifteen sprites, four rules, no cards.
 *
 * A gallery is the one place a grid of images is the right answer — you cannot
 * tell a monocle from a bow tie by reading its name. So the images stay and the
 * chrome goes. The sprite sits directly on the page; only the piece actually
 * being worn gets a tinted tile behind it, which means at most one cell per slot
 * is ever a box and "what's on" is legible from across the room.
 *
 * State is a recolour and a word, never a badge: worn is tinted and says
 * "wearing", owned says "put on", and a locked piece is simply faded with its
 * price under it — in accent when the jar can cover it, grey when it can't.
 */
export default function Wardrobe({ doc, onPress }: { doc: WardrobeDoc; onPress: (item: WardrobeItem) => void }) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const colW = width > 0 ? Math.floor((width - GAP * (COLS - 1)) / COLS) : 0;

  return (
    <View onLayout={onLayout}>
      {doc.slots.map((slot) => (
        <Slot key={slot.slot} slot={slot} colW={colW} onPress={onPress} />
      ))}
    </View>
  );
}

function Slot({ slot, colW, onPress }: { slot: WardrobeSlot; colW: number; onPress: (item: WardrobeItem) => void }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  // Hue means "is this slot filled" — the chapter recolours rather than
  // sprouting a marker beside its name.
  const tint = slot.filled ? colors.accent : colors.label3;

  return (
    <View style={styles.slot}>
      <View style={styles.head} accessibilityRole="header">
        <Text style={[styles.headLabel, { color: tint }]}>{slot.label.toUpperCase()}</Text>
        <View style={[styles.rule, { backgroundColor: withAlpha(tint, 0.28) }]} />
        {/* Trailing, on the rule: what is on, or — when nothing is — what
            belongs here, so an empty slot reads as content rather than a gap. */}
        <Text numberOfLines={1} style={[styles.headValue, slot.filled && { color: colors.accent, fontFamily: font.semibold }]}>
          {slot.value}
        </Text>
      </View>

      {colW > 0 ? (
        <View style={styles.grid}>
          {slot.items.map((item) => (
            <Cell key={item.cosmetic.id} item={item} colW={colW} onPress={() => onPress(item)} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Cell({ item, colW, onPress }: { item: WardrobeItem; colW: number; onPress: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { cosmetic: c, owned, worn, affordable } = item;
  const tile = colW - 8;
  const sprite = Math.round(tile * 0.66);

  const status = worn ? "wearing" : owned ? "put on" : null;

  return (
    <PressableScale
      haptic
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityState={{ selected: worn, disabled: !owned && !affordable }}
      accessibilityLabel={
        worn ? `${c.name}, wearing` : owned ? `${c.name}, put on` : `${c.name}, ${c.price} coins${affordable ? "" : ", not enough coins"}`
      }
      style={{ width: colW }}
    >
      <View style={styles.cell}>
        <View style={[styles.tile, { width: tile, height: tile }, worn && styles.tileWorn]}>
          {/* Faded rather than locked-with-a-padlock: the thing you don't own
              yet should still be the thing you can see. */}
          <View style={owned ? undefined : styles.dim}>
            <PixelCosmetic id={c.id} size={sprite} />
          </View>
        </View>
        <Text numberOfLines={2} style={[styles.name, worn && styles.nameWorn]}>
          {c.name}
        </Text>
        {/* One status line on every cell, always the same height, so a row of
            owned and unowned pieces still lines up along its floor. */}
        <View style={styles.status}>
          {status ? (
            <Text style={[styles.statusLabel, worn && styles.statusWorn]}>{status}</Text>
          ) : (
            <>
              <PixelSprite sprite={COIN_SPRITE} size={11} />
              <Text style={[styles.price, affordable && styles.priceOn]}>{c.price}</Text>
            </>
          )}
        </View>
      </View>
    </PressableScale>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    slot: { marginTop: 32 },
    head: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
    headLabel: { fontSize: 11.5, fontFamily: font.bold, letterSpacing: 1.3 },
    rule: { flex: 1, height: StyleSheet.hairlineWidth },
    headValue: { maxWidth: "48%", fontSize: 13, fontFamily: font.medium, color: colors.label3 },

    grid: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: GAP },
    cell: { alignItems: "center" },
    // No fill and no border by default: a piece is a sprite on the page. Only
    // the one being worn becomes a tile, so a slot has at most one box in it.
    tile: { alignItems: "center", justifyContent: "center", borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: "transparent" },
    tileWorn: { backgroundColor: colors.accentSoft, borderColor: withAlpha(colors.accent, 0.34) },
    dim: { opacity: 0.34 },

    // Two lines' worth of box whether or not the name needs both, so the status
    // line below sits at the same height across the row.
    name: { marginTop: 7, height: 30, fontSize: 11.5, lineHeight: 15, fontFamily: font.medium, color: colors.label2, textAlign: "center" },
    nameWorn: { color: colors.label, fontFamily: font.semibold },

    status: { height: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
    statusLabel: { fontSize: 11, fontFamily: font.medium, color: colors.label3 },
    statusWorn: { color: colors.accent, fontFamily: font.semibold },
    price: { fontSize: 11.5, fontFamily: font.semibold, color: colors.label3 },
    priceOn: { color: colors.accentDeep },
  });
