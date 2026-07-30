/**
 * Poster themes for the share card.
 *
 * Users pick a background and an ink tone before sharing, but NOT as two free
 * choices: a freeform color picker reliably produces unreadable posters, and
 * the whole reason the card looks designed is that its contrast is guaranteed.
 * So each theme declares which ink tones it actually supports, measured rather
 * than eyeballed — see CONTRAST below — and the picker only offers those.
 *
 * Contrast was computed as WCAG ratio between the ink and the WORSE of the two
 * gradient stops, after compositing the poster's legibility scrim (white ink
 * darkens the backdrop, dark ink lightens it).
 *
 * The scrim ramps in rather than being flat, so the ratio varies by height —
 * these are measured at the TOP of the text block (the pet's name), where the
 * scrim is weakest and the text is therefore hardest to read. Everything below
 * it only gets better. Every pairing listed in `inks` clears 4.5:1:
 *
 *   theme      light ink   dark ink
 *   midnight     17.04       2.65   ← dark bg, light ink only
 *   ink          16.30       2.62   ← dark bg, light ink only
 *   violet        8.60       5.43
 *   ocean         6.37       5.39
 *   meadow        5.77       5.97
 *   blossom       5.62       5.96
 *   sunset        5.02       6.97   ← tightest pairing
 *   cream         2.44      14.14   ← pale bg, dark ink only
 */

export type InkTone = "light" | "dark";

export type ShareTheme = {
  id: string;
  label: string;
  gradient: [string, string];
  /** Ink tones that clear 4.5:1 on this background. First is the default. */
  inks: InkTone[];
};

/**
 * `pet` is resolved at render time from the pet's own gradient — it is the
 * default so the poster still feels like *that* pet unless the user opts out.
 * Its ink options are computed, since a pet's gradient is user-affected data
 * rather than a palette we control.
 */
export const PET_THEME_ID = "pet";

export const SHARE_THEMES: ShareTheme[] = [
  { id: "midnight", label: "Midnight", gradient: ["#2b2440", "#151222"], inks: ["light"] },
  { id: "violet", label: "Violet", gradient: ["#6b55df", "#544ec5"], inks: ["light", "dark"] },
  { id: "ocean", label: "Ocean", gradient: ["#00969f", "#00649e"], inks: ["light", "dark"] },
  { id: "meadow", label: "Meadow", gradient: ["#40a35c", "#007a5f"], inks: ["light", "dark"] },
  { id: "blossom", label: "Blossom", gradient: ["#db6ea5", "#c43e49"], inks: ["light", "dark"] },
  { id: "sunset", label: "Sunset", gradient: ["#c69612", "#c66000"], inks: ["light", "dark"] },
  { id: "cream", label: "Cream", gradient: ["#f3ead9", "#e3d3b8"], inks: ["dark"] },
  { id: "ink", label: "Ink", gradient: ["#2e2c38", "#141319"], inks: ["light"] },
];

/** Relative luminance (WCAG 2.x). */
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function ratio(a: number, b: number) {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Composites a color over black/white at the scrim's alpha. */
function composite(hex: string, alpha: number, towards: "black" | "white") {
  const h = hex.replace("#", "");
  const base = towards === "black" ? 0 : 255;
  const ch = [0, 2, 4].map((i) => Math.round(parseInt(h.slice(i, i + 2), 16) * (1 - alpha) + base * alpha));
  return `#${ch.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Peak scrim alpha, reached at the very bottom of the poster. PetShareCard
 * ramps up to this along a smoothstep curve — keep the two in sync.
 */
export const SCRIM_ALPHA = 0.52;

/** Where the scrim starts ramping, as a fraction of height. Mirrors PetShareCard. */
export const SCRIM_START = 0.06;
/**
 * Where the top line of text sits, as a fraction of canvas height — the name,
 * ~365pt down the 640pt story canvas. Keep this in step with PetShareCard's
 * layout: it moves UP the canvas as the text block grows, into a weaker part of
 * the scrim, so a stale value here silently overstates the real contrast.
 */
const TEXT_TOP = 365 / 640;

/** The scrim's easing curve — smoothstep, matching PetShareCard's stops. */
export function scrimAlphaAt(p: number): number {
  const t = Math.max(0, Math.min(1, (p - SCRIM_START) / (1 - SCRIM_START)));
  return SCRIM_ALPHA * (t * t * (3 - 2 * t));
}

/**
 * The alpha where the TOP line of text sits. Because the ramp is gradual this
 * is well under SCRIM_ALPHA, and it — not the peak — decides whether a pairing
 * is readable: gating on the peak would approve tones that look fine on the
 * bottom fact row and wash out on the name. Derived from the curve rather than
 * hardcoded, so retuning the scrim can't leave this stale.
 */
const SCRIM_ALPHA_AT_TEXT = scrimAlphaAt(TEXT_TOP);

/**
 * `plate` / `plateBorder` are the frosted-glass pair: a translucent wash over
 * whatever gradient is behind, plus a lighter rim. Used by the artwork plate,
 * the alert chip and the header's pixel plate, so all three read as the same
 * material.
 */
export const INK_COLORS: Record<InkTone, { primary: string; secondary: string; plate: string; plateBorder: string }> = {
  light: {
    primary: "#ffffff",
    secondary: "rgba(255, 255, 255, 0.74)",
    plate: "rgba(255, 255, 255, 0.16)",
    plateBorder: "rgba(255, 255, 255, 0.24)",
  },
  dark: {
    primary: "#141319",
    secondary: "rgba(20, 19, 25, 0.66)",
    plate: "rgba(255, 255, 255, 0.30)",
    plateBorder: "rgba(20, 19, 25, 0.16)",
  },
};

/**
 * Contrast of an ink tone against a gradient at the poster's hardest-to-read
 * spot: the top line of text, over the worse of the two gradient stops.
 */
export function inkContrast(gradient: [string, string], tone: InkTone): number {
  const ink = luminance(tone === "light" ? "#ffffff" : "#141319");
  const towards = tone === "light" ? "black" : "white";
  return Math.min(...gradient.map((stop) => ratio(ink, luminance(composite(stop, SCRIM_ALPHA_AT_TEXT, towards)))));
}

/** Ink tones that clear the 4.5:1 body-text minimum on an arbitrary gradient. */
export function legibleInks(gradient: [string, string]): InkTone[] {
  const tones = (["light", "dark"] as InkTone[]).filter((t) => inkContrast(gradient, t) >= 4.5);
  // A gradient can in principle fail both (a mid-tone grey). Never return an
  // empty list — fall back to whichever tone is least bad, so the picker always
  // has something to select and the poster always renders.
  if (tones.length > 0) return tones;
  return [inkContrast(gradient, "light") >= inkContrast(gradient, "dark") ? "light" : "dark"];
}

/** Resolves a theme id (or the pet sentinel) to a concrete gradient + ink set. */
export function resolveTheme(themeId: string, petGradient: [string, string]): ShareTheme {
  if (themeId === PET_THEME_ID) {
    return { id: PET_THEME_ID, label: "Pet color", gradient: petGradient, inks: legibleInks(petGradient) };
  }
  return SHARE_THEMES.find((t) => t.id === themeId) ?? { id: PET_THEME_ID, label: "Pet color", gradient: petGradient, inks: legibleInks(petGradient) };
}
