import type { ViewStyle } from "react-native";

export interface Colors {
  scheme: "light" | "dark";
  bg: string;
  /** Cards, wells, inputs, secondary buttons. */
  surface: string;
  border: string;
  ink: string;
  /** Secondary text. */
  ink2: string;
  /** Tertiary text and disabled. */
  ink3: string;
  /** The inverted card (the + panel): black in light mode, white in dark. */
  inverse: string;
  inverseInk: string;
  inverseInk2: string;
  /** Round buttons sitting on the inverse card. */
  inverseSurface: string;
  scrim: string;
  /** No red in this design: destructive actions are told apart by their text. */
  danger: string;
}

export const lightColors: Colors = {
  scheme: "light",
  bg: "#FFFFFF",
  surface: "#F4F4F4",
  border: "#E5E5E5",
  ink: "#000000",
  ink2: "#6B6B6B",
  ink3: "#A3A3A3",
  inverse: "#000000",
  inverseInk: "#FFFFFF",
  inverseInk2: "#9A9A9A",
  inverseSurface: "#1F1F1F",
  scrim: "rgba(0, 0, 0, 0.35)",
  danger: "#000000",
};

export const darkColors: Colors = {
  scheme: "dark",
  bg: "#000000",
  surface: "#141414",
  border: "#262626",
  ink: "#FFFFFF",
  ink2: "#9A9A9A",
  ink3: "#5C5C5C",
  inverse: "#FFFFFF",
  inverseInk: "#000000",
  inverseInk2: "#6B6B6B",
  inverseSurface: "#E8E8E8",
  scrim: "rgba(0, 0, 0, 0.6)",
  danger: "#FFFFFF",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, "2xl": 24, "3xl": 32, "4xl": 40, "5xl": 56 } as const;

export const radius = { sm: 12, md: 16, lg: 20, xl: 28, pill: 999 } as const;

interface TextStyleToken {
  fontSize: number;
  lineHeight: number;
  fontWeight: "400" | "500" | "600" | "700";
  letterSpacing?: number;
}

/** System font everywhere (SF Pro / Roboto): weights only, never a fontFamily. */
export const type = {
  largeTitle: { fontSize: 32, lineHeight: 38, fontWeight: "700", letterSpacing: -0.4 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "700", letterSpacing: -0.2 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: "600" },
  body: { fontSize: 17, lineHeight: 24, fontWeight: "400" },
  callout: { fontSize: 15, lineHeight: 21, fontWeight: "400" },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: "400" },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "500" },
} satisfies Record<string, TextStyleToken>;

export const borderWidth = 1;

/** Near-invisible: used only on the floating + button and the + panel. Everything else is flat. */
export const shadow = {
  float: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  } satisfies ViewStyle,
} as const;

/** Minimum touch target (pt). */
export const HIT = 44;
