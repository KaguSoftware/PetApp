import { Path } from 'react-native-svg';
import type { Palette } from './palette';

/** Outline thickness in viewBox units (200 box): ~3px at 120px, ~8px at 320px. */
export const OUT = 5;

interface StrokeProps {
  d: string;
  color: string;
  width: number;
  p: Palette;
}

/** A fat rounded limb/tail: dark underlay + fur-coloured stroke on top. */
export function FatStroke({ d, color, width, p }: StrokeProps) {
  return (
    <>
      <Path
        d={d}
        fill="none"
        stroke={p.outline}
        strokeWidth={width + OUT * 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}

/** One soft white highlight blob. */
export function Highlight({ cx, cy, rx, ry, rot, opacity = 0.4 }: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rot: number;
  opacity?: number;
}) {
  return (
    <Path
      d={`M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0 Z`}
      fill="#FFFFFF"
      opacity={opacity}
      transform={`rotate(${rot} ${cx} ${cy})`}
    />
  );
}
