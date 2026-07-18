/**
 * Phase-1 theme tokens, converted from the web demo's oklch palette
 * (accent hue 285) to concrete sRGB values — RN has no oklch() support.
 * The full design-system pass (Phase 2) extends this file; screens must
 * pull colors from here, never hardcode.
 */
export const colors = {
  accent: "#6d5ae6", // oklch(0.55 0.2 285)
  accentSoft: "rgba(109, 90, 230, 0.10)",
  bg: "#f2f2f7", // iOS grouped background
  card: "#ffffff",
  label: "#0a0a0a",
  label2: "#636366",
  label3: "#aeaeb2",
  separator: "rgba(60, 60, 67, 0.12)",
  fill: "rgba(120, 120, 128, 0.12)",
  red: "#dc2626",
  redSoft: "rgba(220, 38, 38, 0.10)",
  green: "#15803d",
  greenSoft: "rgba(22, 163, 74, 0.10)",
  orange: "#c2410c",
  orangeSoft: "rgba(234, 88, 12, 0.10)",
} as const;

export const radius = { sm: 10, md: 14, lg: 20, xl: 28 } as const;
