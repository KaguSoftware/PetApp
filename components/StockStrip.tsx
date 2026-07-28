import { useRouter } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { PressableScale, PRESS_SCALE_SMALL } from "@/components/ui";
import type { Pet } from "@/lib/data";
import { font, radius, useColors, type Colors } from "@/lib/theme";

/** Level → the pill's tint. Colour IS the status here; there is no label. */
function toneFor(level: number, colors: Colors): { fg: string; bg: string } {
  if (level < 20) return { fg: colors.red, bg: colors.redSoft };
  if (level < 50) return { fg: colors.orange, bg: colors.orangeSoft };
  return { fg: colors.green, bg: colors.greenSoft };
}

/**
 * Short label for a supply — the strip sits on one line beside the Manage
 * button, so the stored names ("Dry food", "Poop bags") are too long to fit on
 * a narrow phone. Keyed off the supply's icon, which is what the whole app uses
 * to tell food from sanitation.
 */
function shortLabel(icon: string, species: Pet["species"], fallback: string) {
  if (icon === "bowl") return "Food";
  if (icon === "broom") return species === "cat" ? "Litter" : "Bags";
  return fallback;
}

/**
 * Home stock strip — sits directly under the pet hero and shows the levels for
 * whichever pet the carousel is on: a coloured percentage per supply and a way
 * into the pet's detail page, where restocking lives. Deliberately one tiny
 * line; the full breakdown is a tap away.
 */
export default function StockStrip({ pet }: { pet?: Pet }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();

  if (!pet || pet.supplies.length === 0) return null;

  return (
    <View style={styles.strip}>
      {pet.supplies.map((s) => {
        const tone = toneFor(s.level, colors);
        const label = shortLabel(s.icon, pet.species, s.name);
        return (
          <View
            key={s.id}
            style={[styles.pill, { backgroundColor: tone.bg }]}
            accessibilityLabel={`${s.name} ${s.level} percent`}
          >
            <Text numberOfLines={1} style={[styles.pillLabel, { color: tone.fg }]}>
              {label}
            </Text>
            <Text style={[styles.pillPct, { color: tone.fg }]}>{s.level}%</Text>
          </View>
        );
      })}
      <View style={styles.spacer} />
      <PressableScale
        scaleTo={PRESS_SCALE_SMALL}
        onPress={() => router.push(`/pet/${pet.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`Manage ${pet.name}'s stock`}
        hitSlop={10}
      >
        <Text style={styles.manage}>Manage stock</Text>
      </PressableScale>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    // No card, no header — it reads as a caption line hanging off the hero.
    strip: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 2 },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderRadius: radius.full,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    pillLabel: { fontSize: 11.5, fontFamily: font.medium, opacity: 0.85 },
    pillPct: { fontSize: 11.5, fontFamily: font.bold, letterSpacing: -0.1 },
    spacer: { flex: 1, minWidth: 4 },
    manage: { fontSize: 12.5, fontFamily: font.semibold, color: colors.accent },
  });
