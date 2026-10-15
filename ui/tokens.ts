import type { ViewStyle } from "react-native";

export type Tone = "ice" | "peach" | "mint" | "butter" | "pink" | "grey";

export interface ToneColors {
  /** Pastel card fill. */
  bg: string;
  /** Saturated sibling for icons and small marks drawn on top of `bg`. */
  fg: string;
}

export interface Colors {
  scheme: "light" | "dark";
  bg: string;
  surface: string;
  /** Slightly recessed fill (inputs, wells). */
  sunken: string;
  border: string;
  ink: string;
  ink2: string;
  ink3: string;
  /** Text and icons drawn on an `ink` fill (primary pill, Log button). */
  onInk: string;
  green: string;
  amber: string;
  blue: string;
  pink: string;
  /** Gentle error text. Used sparingly: negative states are soft, never alarming. */
  danger: string;
  scrim: string;
  tones: Record<Tone, ToneColors>;
}

export const lightColors: Colors = {
  scheme: "light",
  bg: "#FDF6E7",
  surface: "#FFFFFF",
  sunken: "#F7EFDD",
  border: "#EDEDF2",
  ink: "#262626",
  ink2: "#6A6A6A",
  ink3: "#9A9A9A",
  onInk: "#FFFFFF",
  green: "#4BA85C",
  amber: "#FFC34D",
  blue: "#3C8AF3",
  pink: "#F58BA8",
  danger: "#D9534F",
  scrim: "rgba(38, 38, 38, 0.38)",
  tones: {
    ice: { bg: "#E9F0FF", fg: "#3C8AF3" },
    peach: { bg: "#FFE7E1", fg: "#F2806B" },
    mint: { bg: "#E3F4E6", fg: "#4BA85C" },
    butter: { bg: "#FFF1D1", fg: "#E8A417" },
    pink: { bg: "#FCDBE4", fg: "#E8638A" },
    grey: { bg: "#EDEDF2", fg: "#7A7A8C" },
  },
};

// Warm cocoa rather than neutral grey: the cream light theme should "dim", not invert.
export const darkColors: Colors = {
  scheme: "dark",
  bg: "#1E1915",
  surface: "#2A241E",
  sunken: "#241F19",
  border: "#3A322A",
  ink: "#F7EFE2",
  ink2: "#BDB2A3",
  ink3: "#8A7F72",
  onInk: "#1E1915",
  green: "#6CC47C",
  amber: "#FFCB66",
  blue: "#6AA5F7",
  pink: "#F59DB6",
  danger: "#F08480",
  scrim: "rgba(0, 0, 0, 0.55)",
  tones: {
    ice: { bg: "#27303F", fg: "#7FB0F7" },
    peach: { bg: "#3C2B27", fg: "#F59A88" },
    mint: { bg: "#27352B", fg: "#6CC47C" },
    butter: { bg: "#3B3220", fg: "#F2BF4A" },
    pink: { bg: "#3D2A32", fg: "#F294B0" },
    grey: { bg: "#332E28", fg: "#A39A8E" },
  },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, "2xl": 24, "3xl": 32, "4xl": 40, "5xl": 56 } as const;

export const radius = { sm: 14, md: 20, lg: 28, xl: 36, pill: 999 } as const;

export const fonts = {
  displaySemi: "BricolageGrotesque_600SemiBold",
  displayBold: "BricolageGrotesque_700Bold",
  displayXBold: "BricolageGrotesque_800ExtraBold",
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

interface TextStyleToken {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
}

export const type = {
  display: { fontFamily: fonts.displayXBold, fontSize: 36, lineHeight: 40, letterSpacing: -0.8 },
  title: { fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  label: { fontFamily: fonts.displaySemi, fontSize: 16, lineHeight: 20 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
} satisfies Record<string, TextStyleToken>;

export const borderWidth = 2;

/** Near-invisible by design: depth comes from pastel fills and the 2px border, not shadows. */
export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 1,
  } satisfies ViewStyle,
  float: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  } satisfies ViewStyle,
} as const;

/** Minimum touch target (pt). */
export const HIT = 44;
