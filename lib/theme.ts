/**
 * PetPal design tokens — exact sRGB conversions of the web demo's oklch
 * palette (globals.css), accent hue 285. RN has no oklch(); these values were
 * generated with culori from the source tokens. Screens must pull from here,
 * never hardcode colors.
 */
export const colors = {
  bg: "#f4f3f8", // grouped background, faint warm tint — oklch(0.966 0.006 292)
  card: "#fefeff", // near-white card — oklch(0.998 0.003 292)
  label: "#1c1c23", // ink — oklch(0.23 0.014 288)
  label2: "#5d5c66", // secondary label
  label3: "#888891", // tertiary label
  sep: "rgba(28, 28, 35, 0.09)",
  fill: "rgba(58, 57, 69, 0.06)",
  accent: "#6b55df", // warm indigo/violet — oklch(0.55 0.2 285)
  accentSoft: "rgba(107, 85, 223, 0.12)",
  accentDeep: "#544ec5",
  green: "#00a45c",
  greenSoft: "rgba(0, 164, 92, 0.13)",
  red: "#e23242",
  redSoft: "rgba(226, 50, 66, 0.1)",
  orange: "#e87f25",
  orangeSoft: "rgba(232, 127, 37, 0.15)",
  // Per-action tones outside the core ramp (groomed / vet)
  groomTint: "#a95cbb",
  groomBg: "rgba(169, 92, 187, 0.1)",
  vetTint: "#008892",
  vetBg: "rgba(0, 136, 146, 0.1)",
  // Arcade stage (pet world only)
  arcadeGlow: "rgba(126, 110, 242, 0.14)",
  arcadeGrid: "rgba(94, 90, 154, 0.05)",
  white: "#ffffff",
} as const;

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, full: 999 } as const;

/**
 * Derive an alpha variant of a theme hex color (e.g. withAlpha(colors.label, 0.18)).
 * Use this instead of hand-typed rgba() literals so every tint traces back to
 * a named token.
 */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Inter is the only UI family; pixel font is reserved for the pet world. */
export const font = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  pixel: "GeistPixel",
} as const;

/** Type scale — fixed steps, iOS-adjacent (body 15–17, footnote 13). */
export const type = {
  largeTitle: { fontSize: 28, fontFamily: font.bold, letterSpacing: -0.4, color: colors.label },
  title: { fontSize: 22, fontFamily: font.bold, letterSpacing: -0.3, color: colors.label },
  headline: { fontSize: 17, fontFamily: font.semibold, color: colors.label },
  body: { fontSize: 15, fontFamily: font.regular, color: colors.label },
  bodyMedium: { fontSize: 15, fontFamily: font.medium, color: colors.label },
  subhead: { fontSize: 14, fontFamily: font.regular, color: colors.label2 },
  footnote: { fontSize: 13, fontFamily: font.regular, color: colors.label2 },
  caption: { fontSize: 12, fontFamily: font.medium, color: colors.label3 },
} as const;

/** Standard card shadow (web: soft 0 1px 2px + ambient). Keep subtle. */
export const cardShadow = {
  shadowColor: "#3a3945",
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

/** Elevated sheet/island shadow. */
export const floatShadow = {
  shadowColor: "#3a3945",
  shadowOpacity: 0.13,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 10 },
  elevation: 8,
} as const;

/** Minimum tappable size (HIG). */
export const HIT = 44;
