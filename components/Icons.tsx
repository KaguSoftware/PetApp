import type React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { ActionType } from "@/lib/data";

export type IconName =
  | "home" | "bell" | "heart-text" | "bag" | "people"
  | "plus" | "chevron-right" | "chevron-left" | "chevron-down" | "check" | "xmark"
  | "bowl" | "drop" | "broom" | "paw" | "scissors" | "pill" | "stethoscope"
  | "calendar" | "clock" | "lock" | "star" | "coin" | "sparkles" | "flame" | "arrow-up"
  | "chart" | "box" | "gear" | "cross" | "refresh" | "pin" | "cube"
  | "list" | "eye" | "person"
  | "yarn" | "clipper" | "shield" | "door"
  | "syringe" | "repeat" | "share" | "gift"
  | "alert" | "trash" | "scale";

/*
 * Clean stroke icon set (SF Symbols / Lucide register): 24×24 grid,
 * stroke="currentColor", strokeWidth 2, round caps and joins. The pixel-art
 * language is reserved for the pets and their world (sprites, cosmetics);
 * UI chrome uses these neutral icons. Small filled dots use fill="currentColor"
 * with stroke="none" on the element itself.
 */
const P: Record<IconName, React.ReactNode> = {
  home: (
    <>
      <Path d="m3 9.5 9-7 9 7V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <Path d="M9 21v-8h6v8" />
    </>
  ),
  bell: (
    <>
      <Path d="M6 8.5a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 14.5 6 8.5" />
      <Path d="M10.3 20a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
  "heart-text": (
    <Path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
  ),
  bag: (
    <>
      <Path d="M6 2.5 3.5 6v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2V6L18 2.5Z" />
      <Path d="M3.5 6h17" />
      <Path d="M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  people: (
    <>
      <Circle cx="9" cy="7.5" r="3.5" />
      <Path d="M2.5 20.5v-1a5.5 5.5 0 0 1 5.5-5.5h2a5.5 5.5 0 0 1 5.5 5.5v1" />
      <Path d="M16 4.3a3.5 3.5 0 0 1 0 6.4" />
      <Path d="M18.5 14.3a5.5 5.5 0 0 1 3 4.9v1.3" />
    </>
  ),
  plus: (
    <>
      <Path d="M12 5v14" />
      <Path d="M5 12h14" />
    </>
  ),
  "chevron-right": <Path d="m9 18 6-6-6-6" />,
  "chevron-left": <Path d="m15 18-6-6 6-6" />,
  "chevron-down": <Path d="m6 9 6 6 6-6" />,
  check: <Path d="m4 12.5 5.5 5.5L20 6.5" />,
  xmark: (
    <>
      <Path d="M18 6 6 18" />
      <Path d="m6 6 12 12" />
    </>
  ),
  bowl: (
    <>
      <Path d="M4 12.5h16" />
      <Path d="M4.5 12.5a7.5 7.5 0 0 0 15 0" />
      <Circle cx="9" cy="8.5" r="1" fill="currentColor" stroke="none" />
      <Circle cx="12.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      <Circle cx="15.5" cy="9" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  drop: (
    <Path d="M12 21.5a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5-2 1.6-3 3.5-3 5.5a7 7 0 0 0 7 7Z" />
  ),
  broom: (
    <>
      <Path d="m19.5 3.5-7.8 7.8" />
      <Path d="M11.7 11.3a4.6 4.6 0 0 0-6.5 0L3.5 13l7.5 7.5 1.7-1.7a4.6 4.6 0 0 0 0-6.5Z" />
      <Path d="m7 15.5-2 2" />
    </>
  ),
  paw: (
    <>
      <Circle cx="7" cy="8.5" r="1.8" />
      <Circle cx="12" cy="6.5" r="1.8" />
      <Circle cx="17" cy="8.5" r="1.8" />
      <Path d="M12 11.5c-2.9 0-5.3 2.1-5.3 4.6 0 1.7 1.3 3 3 3 .9 0 1.6-.4 2.3-.4s1.4.4 2.3.4c1.7 0 3-1.3 3-3 0-2.5-2.4-4.6-5.3-4.6Z" />
    </>
  ),
  scissors: (
    <>
      <Circle cx="6" cy="6" r="2.7" />
      <Circle cx="6" cy="18" r="2.7" />
      <Path d="M8.2 8.2 20 20" />
      <Path d="M20 4 8.2 15.8" />
    </>
  ),
  pill: (
    <>
      <Path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
      <Path d="m8.5 8.5 7 7" />
    </>
  ),
  stethoscope: (
    <>
      <Path d="M5 3H4a1 1 0 0 0-1 1v5a6 6 0 0 0 12 0V4a1 1 0 0 0-1-1h-1" />
      <Path d="M9 15v2a5.5 5.5 0 0 0 11 0v-3" />
      <Circle cx="20" cy="11.5" r="2" />
    </>
  ),
  calendar: (
    <>
      <Rect x="3.5" y="4.5" width="17" height="16" rx="2" />
      <Path d="M8 2.5v4" />
      <Path d="M16 2.5v4" />
      <Path d="M3.5 10h17" />
    </>
  ),
  clock: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v5l3.2 2" />
    </>
  ),
  lock: (
    <>
      <Rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <Path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </>
  ),
  star: (
    <Path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.8-5.4 2.8 1-6-4.4-4.3 6.1-.9Z" />
  ),
  coin: (
    <>
      <Circle cx="12" cy="12" r="8.5" />
      <Circle cx="12" cy="12" r="4.5" />
    </>
  ),
  sparkles: (
    <>
      <Path d="M11 4.5 12.7 9 17 10.5 12.7 12 11 16.5 9.3 12 5 10.5 9.3 9Z" />
      <Path d="M18.5 15.5v5" />
      <Path d="M16 18h5" />
    </>
  ),
  flame: (
    <Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5Z" />
  ),
  "arrow-up": (
    <>
      <Path d="M12 19V5" />
      <Path d="m5 12 7-7 7 7" />
    </>
  ),
  chart: (
    <>
      <Path d="M3.5 3.5v15a2 2 0 0 0 2 2h15" />
      <Path d="m7.5 14 4-4.5 3 3 5-5.5" />
    </>
  ),
  box: (
    <>
      <Rect x="3" y="4" width="18" height="5" rx="1" />
      <Path d="M5 9v9.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
      <Path d="M10 13.5h4" />
    </>
  ),
  gear: (
    <>
      <Path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z" />
      <Circle cx="12" cy="12" r="3" />
    </>
  ),
  cross: <Path d="M9.5 4h5v5.5H20v5h-5.5V20h-5v-5.5H4v-5h5.5Z" />,
  refresh: (
    <>
      <Path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5" />
      <Path d="M3.5 3.5v5h5" />
    </>
  ),
  pin: (
    <>
      <Path d="M20 10.5c0 5.5-8 11.5-8 11.5s-8-6-8-11.5a8 8 0 0 1 16 0Z" />
      <Circle cx="12" cy="10.5" r="3" />
    </>
  ),
  cube: (
    <>
      <Path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <Path d="m3.3 7 8.7 5 8.7-5" />
      <Path d="M12 22V12" />
    </>
  ),
  list: (
    <>
      <Path d="M8.5 6h12" />
      <Path d="M8.5 12h12" />
      <Path d="M8.5 18h12" />
      <Circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
      <Circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
      <Circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  eye: (
    <>
      <Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <Circle cx="12" cy="12" r="3" />
    </>
  ),
  person: (
    <>
      <Circle cx="12" cy="7.5" r="3.5" />
      <Path d="M5 20.5a7 7 0 0 1 14 0" />
    </>
  ),
  yarn: (
    <>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M4.6 9.2c3.9.4 7.3 2.3 9.9 6.3" />
      <Path d="M6.6 17.2c2.3-3 6-4.6 10.3-4.1" />
    </>
  ),
  clipper: (
    <>
      <Path d="M4 16.5 14.5 6a2.47 2.47 0 0 1 3.5 3.5L7.5 20H4Z" />
      <Path d="m14 8.5 3.5 3.5" />
      <Path d="M17.5 15.5 20 18" />
    </>
  ),
  shield: (
    <Path d="M12 2.5 19.5 5v6c0 4.8-3.2 8.9-7.5 10.5C7.7 19.9 4.5 15.8 4.5 11V5Z" />
  ),
  door: (
    <>
      <Path d="M3 21h18" />
      <Path d="M6 21V4.5a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 18 4.5V21" />
      <Circle cx="14.8" cy="12.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  alert: (
    <>
      <Path d="M10.3 3.9 1.9 17.9A2 2 0 0 0 3.6 21h16.8a2 2 0 0 0 1.7-3.1L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <Path d="M12 9v4.5" />
      <Circle cx="12" cy="17" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  trash: (
    <>
      <Path d="M3.5 6.5h17" />
      <Path d="M19 6.5V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6.5" />
      <Path d="M8.5 6.5V5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" />
      <Path d="M10 11v6" />
      <Path d="M14 11v6" />
    </>
  ),
  scale: (
    <>
      <Circle cx="12" cy="5.5" r="3" />
      <Path d="M7 8.5a2 2 0 0 0-1.9 1.4l-2.5 9A2 2 0 0 0 4.5 21.5h15a2 2 0 0 0 1.9-2.6l-2.5-9A2 2 0 0 0 17 8.5Z" />
    </>
  ),
  syringe: (
    <>
      <Path d="m18 2 4 4" />
      <Path d="m17 7 3-3" />
      <Path d="M19 9 8.7 19.3a2.4 2.4 0 0 1-3.4 0l-.6-.6a2.4 2.4 0 0 1 0-3.4L15 5" />
      <Path d="m9 11 4 4" />
      <Path d="m5 19-3 3" />
    </>
  ),
  repeat: (
    <>
      <Path d="m17 2 4 4-4 4" />
      <Path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <Path d="m7 22-4-4 4-4" />
      <Path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </>
  ),
  share: (
    <>
      <Path d="M12 3v12" />
      <Path d="m8 6.5 4-4 4 4" />
      <Path d="M7.5 10.5H6a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6.5a2 2 0 0 0-2-2h-1.5" />
    </>
  ),
  gift: (
    <>
      <Rect x="3.5" y="8" width="17" height="4" rx="1" />
      <Path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
      <Path d="M12 8v13" />
      <Path d="M12 8H8.5a2.25 2.25 0 1 1 0-4.5C11 3.5 12 8 12 8Z" />
      <Path d="M12 8h3.5a2.25 2.25 0 1 0 0-4.5C13 3.5 12 8 12 8Z" />
    </>
  ),
};

/**
 * Clean stroke icon set, ported 1:1 from the web demo. `currentColor` resolves
 * through the `color` prop on the root <Svg>, mirroring the web's CSS cascade.
 */
export function Icon({
  name,
  size = 22,
  color = "#0a0a0a",
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      color={color}
    >
      {P[name]}
    </Svg>
  );
}

/**
 * Per-action icon + tint/bg tokens. The web stores Tailwind class names here;
 * on native these are resolved to concrete colors via lib/theme (Phase 2) —
 * for now the keys mirror the web's semantic tones.
 */
export const ACTION_ICON: Record<ActionType, { icon: IconName; tint: string; bg: string }> = {
  fed: { icon: "bowl", tint: "#c2410c", bg: "rgba(234,88,12,0.10)" },
  water: { icon: "drop", tint: "#6d5ae6", bg: "rgba(109,90,230,0.10)" },
  litter: { icon: "broom", tint: "#636366", bg: "rgba(120,120,128,0.12)" },
  walk: { icon: "paw", tint: "#15803d", bg: "rgba(22,163,74,0.10)" },
  groomed: { icon: "scissors", tint: "#b23f9e", bg: "rgba(178,63,158,0.10)" },
  meds: { icon: "pill", tint: "#dc2626", bg: "rgba(220,38,38,0.10)" },
  vet: { icon: "stethoscope", tint: "#0e7490", bg: "rgba(14,116,144,0.10)" },
};
