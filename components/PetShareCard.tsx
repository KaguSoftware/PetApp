import PixelPet from "@/components/pixel/PixelPet";
import PixelSprite from "@/components/pixel/PixelSprite";
import { CAT_SPRITE } from "@/components/pixel/petSprites";
import type { Pet } from "@/lib/data";
import { INK_COLORS, PET_THEME_ID, resolveTheme, scrimAlphaAt, type InkTone } from "@/lib/shareTheme";
import { font, radius } from "@/lib/theme";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

/**
 * The social template — what actually gets posted when someone shares a pet.
 *
 * This is deliberately NOT a screenshot of the card screen. A screenshot carries
 * the app's chrome (nav bar, segmented control, scroll position) and follows the
 * viewer's theme and font scale, so no two shared images look alike. Instead this
 * is a fixed 1080x1920 canvas — the 9:16 story size — laid out in *design* points
 * and scaled up at capture time, so every share is pixel-identical regardless of
 * device size, theme, or accessibility text settings.
 *
 * Composition follows the music-app poster convention: a bold color field floods
 * the whole frame, the artwork sits big and centred, and the text block beneath
 * is a short left-aligned stack — name loud, everything else quiet. A pet has no
 * cover art, but it does have a gradient and a sprite, which stand in for exactly
 * that. Exactly two facts under the name — a poster that tries to be an info
 * table stops reading at thumbnail size, so the full detail (allergies, weight,
 * microchip, vet clinic…) stays on the card screen and in the share text.
 *
 * Colors come from lib/shareTheme (user-selectable, contrast-guaranteed).
 */

/**
 * Design-space canvas, 9:16. Multiply by SHARE_SCALE for the exported pixels:
 * 360x640 @3 = 1080x1920, Instagram/TikTok's native full-screen story size.
 *
 * A story is displayed edge-to-edge, so anything other than 9:16 gets letterboxed
 * with the app's own background — the giveaway that a post was made somewhere
 * else and dropped in. Feed posts crop this to their own ratio and still work;
 * the reverse (a 4:5 image in a story) leaves bars top and bottom.
 */
export const CARD_W = 360;
export const CARD_H = 640;
export const SHARE_SCALE = 3;

/**
 * Story canvases have "unsafe" zones — Instagram overlays the author header at
 * the top and the reply bar at the bottom, and both eat roughly a tenth of the
 * height. The poster keeps its content inside these so nothing important sits
 * under UI chrome.
 */
const STORY_SAFE_TOP = 0.1;
const STORY_SAFE_BOTTOM = 0.14;

/**
 * One spacing scale for the whole poster, so every gap is a multiple of 4 and
 * the rhythm is consistent. Before this, margins were ad-hoc (1, 14, 16, 26,
 * 28, 40) and the vertical rhythm read as slightly-off rather than deliberate.
 */
const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
/** Single side gutter — the text block, badge and footer all align to it. */
const GUTTER = SPACE.xxl;

export type ShareField = { label: string; value: string; mono?: boolean };

export type PetShareCardProps = {
  pet: Pet;
  /** Which template — drives the wording and which facts are hero-worthy. */
  variant: "emergency" | "profile";
  subtitle: string;
  fields: ShareField[];
  /** Theme id from lib/shareTheme, or PET_THEME_ID for the pet's own colors. */
  themeId?: string;
  /** Ink tone. Must be one the theme supports; falls back to the theme default. */
  ink?: InkTone;
};

/**
 * Facts worth a poster slot, most important first, per variant. Everything else
 * is dropped: the full set still goes out in the share *text*, and the whole
 * point of the poster is that it reads in a feed at thumbnail size.
 *
 * "Family contact" leads the emergency list: whoever finds the pet should reach
 * the family first, with the vet as the backup number.
 */
const HERO_FIELDS: Record<PetShareCardProps["variant"], string[]> = {
  emergency: ["Family contact", "Vet phone", "Microchip", "Medication"],
  profile: ["Next birthday", "Age", "Gotcha day", "In the family since"],
};

/** At most this many fact rows — two lines of quiet text under the name. */
const MAX_HERO = 2;

function heroFields(fields: ShareField[], variant: PetShareCardProps["variant"], max: number): ShareField[] {
  const order = HERO_FIELDS[variant];
  const ranked = fields
    .map((f, i) => ({ f, i, rank: order.indexOf(f.label) }))
    .filter((x) => x.rank !== -1)
    .sort((a, b) => a.rank - b.rank);
  // Fall back to source order if none of the preferred labels are present, so
  // an unusual pet still gets a populated poster rather than an empty one.
  const chosen = ranked.length > 0 ? ranked : fields.map((f, i) => ({ f, i, rank: 0 }));
  return chosen.slice(0, max).map((x) => x.f);
}

/**
 * Bottom-weighted legibility scrim. Transparent over the artwork so the color
 * stays vivid, ramping to SCRIM_ALPHA at the bottom edge. Direction depends on
 * the ink: light ink needs the backdrop darkened, dark ink lightened. The
 * measured ratios this buys are tabulated in lib/shareTheme.
 *
 * Sampled from a smoothstep curve rather than declared as a few hand-picked
 * stops. Two reasons, both visible on dark backgrounds:
 *
 *  - A 3-stop gradient changes SLOPE abruptly at its middle stop, and the eye
 *    reads that slope change as a hard edge — the text area looked like it
 *    began at a seam rather than fading in. Smoothstep has zero derivative at
 *    both ends, so there is no seam where the ramp starts or finishes.
 *  - The old stops reached full alpha at 72% height and sat flat after, which
 *    compressed the entire transition into a narrow band. This spreads it over
 *    the full canvas instead.
 */
const SCRIM_STEPS = 10;

function scrimFor(tone: InkTone): {
  colors: readonly [string, string, ...string[]];
  locations: readonly [number, number, ...number[]];
} {
  const rgb = tone === "light" ? "0,0,0" : "255,255,255";
  const colors: string[] = [];
  const locations: number[] = [];
  for (let i = 0; i <= SCRIM_STEPS; i++) {
    const p = i / SCRIM_STEPS;
    locations.push(p);
    // scrimAlphaAt is the same curve lib/shareTheme measures contrast against,
    // so the guarantee and the pixels can never disagree.
    colors.push(`rgba(${rgb},${scrimAlphaAt(p).toFixed(4)})`);
  }
  // SCRIM_STEPS is a compile-time constant >= 1, so both arrays always have at
  // least the two entries LinearGradient's tuple type requires.
  return {
    colors: colors as unknown as readonly [string, string, ...string[]],
    locations: locations as unknown as readonly [number, number, ...number[]],
  };
}

/**
 * Header plate: a translucent white wash over the poster's gradient with a
 * lighter rim, on a fully rounded pill. The pixel-art character comes from the
 * mascot sitting on it, not from the plate's own edge.
 */
function GlassPlate({ fill, border, children }: { fill: string; border: string; children: React.ReactNode }) {
  return <View style={[styles.plate, { backgroundColor: fill, borderColor: border }]}>{children}</View>;
}

/**
 * Rendered off-screen and handed to captureRef. Keep it free of anything
 * animated or asynchronous — `idle` wobble is off and cosmetics are plain SVG,
 * so the first paint is already the final frame.
 */
export default function PetShareCard({
  pet,
  variant,
  subtitle,
  fields,
  themeId = PET_THEME_ID,
  ink,
}: PetShareCardProps) {
  const emergency = variant === "emergency";
  const theme = resolveTheme(themeId, pet.gradient);
  // Guard the ink against a stale selection: switching to a theme that doesn't
  // support the current tone must not render an illegible poster.
  const tone: InkTone = ink && theme.inks.includes(ink) ? ink : theme.inks[0];
  const INK = INK_COLORS[tone];
  const scrim = scrimFor(tone);
  const rows = heroFields(fields, variant, MAX_HERO);

  return (
    <View style={styles.canvas}>
      <LinearGradient
        colors={theme.gradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={scrim.colors}
        locations={scrim.locations}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Top-centre lockup on a frosted pixel plate — the same glass treatment
          as the artwork plate below, cut to a stepped silhouette. This is the
          poster's header: it reads first and identifies the app, the way a
          ticket or trading card puts its issuer along the top edge. */}
      <View style={styles.header}>
        <GlassPlate fill={INK.plate} border={INK.plateBorder}>
          <PixelSprite sprite={CAT_SPRITE} size={14} />
          <Text style={[styles.headerWord, { color: INK.primary }]}>PetPal</Text>
          <View style={[styles.headerRule, { backgroundColor: INK.plateBorder }]} />
          <Text style={[styles.headerKind, { color: INK.secondary }]}>{emergency ? "EMERGENCY & ID" : "PET PROFILE"}</Text>
        </GlassPlate>
      </View>

      {/* The "cover art" — the sprite alone on the gradient. No plate behind it:
          the pet is the subject, and a frosted panel around it just boxed the
          art in. `flex: 1` centres it in whatever space is left between the
          header and the text block, so the story's extra height becomes air
          around the pet rather than a gap at the bottom. */}
      <View style={styles.artWrap}>
        <PixelPet pet={pet} size={200} idle={false} />
      </View>

      {/* A short left-aligned stack. Name loud, rest quiet. */}
      <View style={styles.textBlock}>
        {/* No `adjustsFontSizeToFit`: it needs a settled layout pass to pick a
            size, and this card is rendered at full 360x640 then transform-scaled
            in the picker preview — under which iOS could resolve the name to
            zero height and drop it entirely. It also conflicts with the fixed
            `lineHeight` below. `numberOfLines={1}` alone truncates a long name
            safely, which is the behaviour it was guarding against anyway. */}
        <Text style={[styles.name, { color: INK.primary }]} numberOfLines={1}>
          {pet.name}
        </Text>
        <Text style={[styles.subtitle, { color: INK.secondary }]} numberOfLines={1}>
          {subtitle}
        </Text>

        {rows.map((f) => (
          <View key={f.label} style={styles.factRow}>
            <Text style={[styles.factLabel, { color: INK.secondary }]}>{f.label.toUpperCase()}</Text>
            <Text style={[styles.factValue, { color: INK.primary }, f.mono && styles.factValueMono]} numberOfLines={1}>
              {f.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  canvas: { width: CARD_W, height: CARD_H, overflow: "hidden" },

  // Clear of Instagram's author header, which floats over the top of a story.
  header: { alignItems: "center", paddingTop: CARD_H * STORY_SAFE_TOP },
  plate: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.sm,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  headerWord: { fontSize: 14, fontFamily: font.bold, letterSpacing: -0.2 },
  headerRule: { width: 1, height: 11 },
  headerKind: { fontSize: 10, fontFamily: font.bold, letterSpacing: 1 },

  // `flex: 1` here (and NOT on textBlock) is deliberate: the art area is the one
  // element that should absorb the canvas's spare height, because scaling the
  // gap around a centred sprite is harmless. Letting the TEXT block flex is what
  // previously clipped its last rows.
  artWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: SPACE.xxl },

  // Sized by its content, and padded clear of the story's reply bar.
  textBlock: { paddingHorizontal: GUTTER, paddingBottom: CARD_H * STORY_SAFE_BOTTOM },
  // Type is a step larger than the 4:5 version: a story is viewed full-screen
  // and often at arm's length, and the taller canvas has the room for it.
  name: { fontSize: 46, lineHeight: 52, fontFamily: font.bold, letterSpacing: -1.3 },
  subtitle: { marginTop: SPACE.xs, fontSize: 16, fontFamily: font.medium },

  factRow: { marginTop: SPACE.lg },
  factLabel: { fontSize: 11, fontFamily: font.bold, letterSpacing: 1 },
  factValue: { marginTop: SPACE.xs, fontSize: 18, fontFamily: font.semibold },
  factValueMono: { fontSize: 15, letterSpacing: 0.8 },
});
