import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Sheet, { SheetScrollable } from "@/components/Sheet";
import PetShareCard, { CARD_H, CARD_W } from "@/components/PetShareCard";
import { AccentButton, PRESS_SCALE_SMALL, PressableScale, SheetFooter, SheetSubtitle, SheetTitle } from "@/components/ui";
import { PET_THEME_ID, SHARE_THEMES, legibleInks, resolveTheme, type InkTone } from "@/lib/shareTheme";
import { font, radius, useColors, type Colors } from "@/lib/theme";
import type { Pet } from "@/lib/data";
import type { ShareField } from "@/components/PetShareCard";

/**
 * Style picker shown before the poster leaves the app: pick a background, see
 * it applied live, then share.
 *
 * Background is the ONLY choice — the ink tone rides along with it. Each theme
 * declares which tones clear 4.5:1 against it (measured — see lib/shareTheme)
 * and the first is used, so the poster is always readable without asking the
 * user to reason about contrast. `onInkChange` still exists because switching
 * to a theme that doesn't support the current tone has to correct it.
 */

/**
 * The live preview, scaled down from the real 360x640 canvas.
 *
 * A 9:16 poster is tall, so this stays small: at 0.34 the whole sheet — preview,
 * swatches and Share button — fits on the smallest phone without scrolling.
 */
const PREVIEW_SCALE = 0.34;

export default function ShareStyleSheet({
  open,
  onClose,
  onShare,
  sharing,
  pet,
  variant,
  subtitle,
  fields,
  themeId,
  onThemeChange,
  ink,
  onInkChange,
}: {
  open: boolean;
  onClose: () => void;
  onShare: () => void;
  sharing: boolean;
  pet: Pet;
  variant: "emergency" | "profile";
  subtitle: string;
  fields: ShareField[];
  themeId: string;
  onThemeChange: (id: string) => void;
  ink: InkTone;
  onInkChange: (tone: InkTone) => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // "Pet color" leads the list — the poster should feel like *that* pet unless
  // the user deliberately opts out.
  const swatches = useMemo(
    () => [
      { id: PET_THEME_ID, label: "Pet color", gradient: pet.gradient, inks: legibleInks(pet.gradient) },
      ...SHARE_THEMES,
    ],
    [pet.gradient]
  );

  const theme = resolveTheme(themeId, pet.gradient);
  const tone: InkTone = theme.inks.includes(ink) ? ink : theme.inks[0];

  return (
    // Scrollable (the default): preview + swatches + footer come to ~574pt,
    // which clears the 88% height cap on a large phone but leaves only ~13pt on
    // an SE. With scrollable={false} that overflow would clip the Share button
    // clean off instead of scrolling to it.
    <Sheet open={open} onClose={onClose}>
      <SheetTitle>Share style</SheetTitle>
      <SheetSubtitle>Pick a background for {pet.name}&apos;s card.</SheetSubtitle>

      <View style={styles.previewWrap}>
        {/* Scaled clone of the real template, so what you pick is what posts. */}
        <View style={styles.previewClip}>
          <View style={styles.previewScaler}>
            <PetShareCard
              pet={pet}
              variant={variant}
              subtitle={subtitle}
              fields={fields}
              themeId={themeId}
              ink={tone}
            />
          </View>
        </View>
      </View>

      <Text style={styles.groupLabel}>BACKGROUND</Text>
      <SheetScrollable>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.swatchRow}
          keyboardShouldPersistTaps="handled"
        >
          {swatches.map((s) => {
            const selected = s.id === themeId;
            return (
              <PressableScale
                key={s.id}
                scaleTo={PRESS_SCALE_SMALL}
                onPress={() => {
                  onThemeChange(s.id);
                  // Carry the tone over when the new theme supports it, else
                  // snap to that theme's default so the preview stays legible.
                  if (!s.inks.includes(ink)) onInkChange(s.inks[0]);
                }}
                accessibilityRole="button"
                accessibilityLabel={s.label}
                accessibilityState={{ selected }}
                style={styles.swatchCell}
              >
                <View style={[styles.swatchRing, selected && { borderColor: colors.accent }]}>
                  <LinearGradient
                    colors={s.gradient}
                    start={{ x: 0.2, y: 0 }}
                    end={{ x: 0.8, y: 1 }}
                    style={styles.swatch}
                  />
                </View>
                <Text style={[styles.swatchLabel, selected && { color: colors.accent, fontFamily: font.semibold }]} numberOfLines={1}>
                  {s.label}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>
      </SheetScrollable>

      <SheetFooter>
        <AccentButton onPress={onShare} loading={sharing}>
          Share
        </AccentButton>
      </SheetFooter>
    </Sheet>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    previewWrap: { alignItems: "center", marginTop: 28 },
    // The card renders at full size and is transform-scaled; the clip box is
    // sized to the SCALED result so it occupies the right space in the layout.
    previewClip: {
      width: CARD_W * PREVIEW_SCALE,
      height: CARD_H * PREVIEW_SCALE,
      borderRadius: radius.lg,
      overflow: "hidden",
      backgroundColor: colors.fill,
    },
    previewScaler: {
      width: CARD_W,
      height: CARD_H,
      transform: [{ scale: PREVIEW_SCALE }],
      // Transforms scale about the centre, so pull the oversized box back to
      // the clip's origin.
      marginLeft: -(CARD_W * (1 - PREVIEW_SCALE)) / 2,
      marginTop: -(CARD_H * (1 - PREVIEW_SCALE)) / 2,
    },

    groupLabel: {
      marginTop: 26,
      marginBottom: 12,
      fontSize: 11,
      fontFamily: font.bold,
      letterSpacing: 0.8,
      color: colors.label3,
    },

    swatchRow: { gap: 14, paddingRight: 8 },
    /**
     * Fixed cell width, sized to the widest label rather than to the circle.
     *
     * Content-sizing the cell aligns each label with its own circle, but leaves
     * the ROW uneven: a label wider than the 52pt swatch grows its cell and
     * pushes the next circle further along than the rest, so one gap in the row
     * reads wrong. Pinning all cells to one width puts the circles on an exact
     * grid — 62 + 14 = a uniform 76pt pitch — and because the label is centred
     * in the same box, every label stays centred under its own circle too.
     *
     * 62 is sized off the longest label ("Pet color", ~52pt at 11pt Inter) with
     * ~10pt spare for font-metric drift, so nothing truncates.
     */
    swatchCell: { alignItems: "center", width: 62 },
    swatchRing: {
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 2,
      borderColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
    },
    swatch: { width: 42, height: 42, borderRadius: 21 },
    swatchLabel: { marginTop: 6, fontSize: 11, fontFamily: font.medium, color: colors.label2, textAlign: "center" },

  });
