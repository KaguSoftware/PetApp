import type { ReactNode } from "react";
import Svg, { Circle, G, Line, Path } from "react-native-svg";

/** Rounded-stroke 24x24 glyphs. Stroke-only so one `color` prop recolours everything. */
const GLYPHS = {
  fed: (
    <>
      <Path d="M3.5 11.5h17c0 4.8-3.5 8-8.5 8s-8.5-3.2-8.5-8Z" />
      <Circle cx={8.8} cy={7.6} r={1.1} />
      <Circle cx={12.2} cy={5.6} r={1.1} />
      <Circle cx={15.4} cy={7.8} r={1.1} />
    </>
  ),
  water: <Path d="M12 3.5c3.6 4.2 6 7.2 6 10.2a6 6 0 0 1-12 0c0-3 2.4-6 6-10.2Z" />,
  litter: (
    <>
      <Path d="M3.5 14h17l-1.6 6h-13.8Z" />
      <Path d="M7 14c0-3 2-4.6 5-4.6s5 1.6 5 4.6" />
      <Path d="M12 3.5v2.2M9 5l.8 1.6M15 5l-.8 1.6" />
    </>
  ),
  walk: (
    <>
      <Path d="M8 16c0-2 1.8-3.6 4-3.6s4 1.6 4 3.6c0 1.8-1.6 2.9-4 2.9S8 17.8 8 16Z" />
      <Circle cx={5.8} cy={11.2} r={1.5} />
      <Circle cx={9.6} cy={7.4} r={1.5} />
      <Circle cx={14.4} cy={7.4} r={1.5} />
      <Circle cx={18.2} cy={11.2} r={1.5} />
    </>
  ),
  groom: (
    <>
      <Path d="M4.2 14.2 11 7.4l5.6 5.6-6.8 6.8a3.9 3.9 0 0 1-5.6-5.6Z" />
      <Path d="M16.5 8.5 20.5 4.5" />
      <Path d="M7.5 15.5l1 1M10 13l1 1" />
    </>
  ),
  pill: (
    <>
      <Path d="M10.5 20.5a4.95 4.95 0 0 1-7-7l10-10a4.95 4.95 0 0 1 7 7Z" />
      <Path d="M8.5 8.5l7 7" />
    </>
  ),
  vet: (
    <>
      <Path d="M6 3.5V9a4 4 0 0 0 8 0V3.5" />
      <Path d="M10 13v2a4.5 4.5 0 0 0 9 0v-1.5" />
      <Circle cx={19} cy={11.5} r={2} />
    </>
  ),
  weight: (
    <>
      <Path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <Path d="M7.8 11a4.2 4.2 0 0 1 8.4 0" />
      <Path d="M12 11l1.8-2.2" />
    </>
  ),
  health: (
    <>
      <Path d="M17 3l4 4" />
      <Path d="M18.5 8.5l-9 9-4.5.8.8-4.5 9-9" />
      <Path d="M15 6l3 3" />
      <Path d="M5.5 18.5 3 21" />
      <Path d="M11.5 11.5l-1.5-1.5M9 14l-1.5-1.5" />
    </>
  ),
  note: (
    <>
      <Path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <Path d="M8.5 12.5h7M8.5 16.5h4.5" />
    </>
  ),
  home: (
    <>
      <Path d="M4 11 12 4l8 7v8.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
      <Path d="M9.5 20.5v-6h5v6" />
    </>
  ),
  history: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3 2" />
    </>
  ),
  book: (
    <>
      <Path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5Z" />
      <Path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5Z" />
    </>
  ),
  settings: (
    <>
      <Circle cx={12} cy={12} r={3} />
      <Circle cx={12} cy={12} r={6.8} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <G key={a} rotation={a} origin="12, 12">
          <Line x1={12} y1={2.8} x2={12} y2={5.2} />
        </G>
      ))}
    </>
  ),
  plus: <Path d="M12 5v14M5 12h14" />,
  close: <Path d="M6 6l12 12M18 6 6 18" />,
  chevron: <Path d="M9 5l7 7-7 7" />,
  check: <Path d="M5 12.5l4.5 4.5L19 7.5" />,
  heart: <Path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z" />,
  share: (
    <>
      <Path d="M12 15V4M8 7.5 12 3.5l4 4" />
      <Path d="M5 12v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-7" />
    </>
  ),
  trash: (
    <>
      <Path d="M4 7h16M9 7V4.5h6V7" />
      <Path d="M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7" />
      <Path d="M10 11v6M14 11v6" />
    </>
  ),
  edit: (
    <>
      <Path d="M4 20l4-1L19.5 7.5a2.1 2.1 0 0 0-3-3L5 16Z" />
      <Path d="M14.5 6.5l3 3" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof GLYPHS;

export function Icon({
  name,
  size = 24,
  color = "#262626",
  strokeWidth = 2.2,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <G stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        {GLYPHS[name]}
      </G>
    </Svg>
  );
}
