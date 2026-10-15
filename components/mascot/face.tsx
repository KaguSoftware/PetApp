import { Circle, Ellipse, G, Path } from 'react-native-svg';
import type { Palette } from './palette';
import type { MascotMood } from './types';

export interface FaceCfg {
  eyeY: number;
  eyeDx: number;
  /** y where the philtrum ends and the mouth starts. */
  mouthY: number;
  cheekY: number;
  cheekDx: number;
}

interface FaceProps {
  p: Palette;
  mood: MascotMood;
  cfg: FaceCfg;
}

const SIDES = [-1, 1] as const;
const STAR = 'M0 -5 Q0.8 -0.8 5 0 Q0.8 0.8 0 5 Q-0.8 0.8 -5 0 Q-0.8 -0.8 0 -5Z';

/** Moods whose resting eyes are closed (blink layer is forced on). */
export function eyesAlwaysClosed(mood: MascotMood): boolean {
  return mood === 'sleepy';
}

export function Cheeks({ p, cfg }: Pick<FaceProps, 'p' | 'cfg'>) {
  return (
    <>
      {SIDES.map((s) => (
        <Ellipse
          key={s}
          cx={100 + s * cfg.cheekDx}
          cy={cfg.cheekY}
          rx={10}
          ry={6.5}
          fill={p.blush}
          opacity={0.6}
        />
      ))}
    </>
  );
}

export function Eyes({ p, mood, cfg }: FaceProps) {
  const lookX = mood === 'restless' ? 3.5 : 0;
  const grumpy = mood === 'grumpy';
  const rx = grumpy ? 9 : 9.5;
  const ry = grumpy ? 8 : mood === 'hungry' ? 12.5 : 11.5;
  const dy = grumpy ? 3 : 0;
  return (
    <>
      {SIDES.map((s) => {
        const cx = 100 + s * cfg.eyeDx + lookX;
        const cy = cfg.eyeY + dy;
        return (
          <G key={s}>
            <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={p.ink} />
            {mood === 'happy' ? (
              <Path
                d={STAR}
                fill="#FFFFFF"
                transform={`translate(${cx + 2.5} ${cy - 3.5}) scale(1.15)`}
              />
            ) : (
              <Circle cx={cx + 3.2} cy={cy - ry * 0.35} r={3.8} fill="#FFFFFF" />
            )}
            <Circle cx={cx - 3.5} cy={cy + ry * 0.4} r={2} fill="#FFFFFF" opacity={0.9} />
          </G>
        );
      })}
    </>
  );
}

export function ClosedEyes({ p, mood, cfg }: FaceProps) {
  const caret = mood === 'happy';
  return (
    <>
      {SIDES.map((s) => {
        const cx = 100 + s * cfg.eyeDx + (mood === 'restless' ? 3.5 : 0);
        const cy = cfg.eyeY;
        const d = caret
          ? `M${cx - 9} ${cy + 3} Q${cx} ${cy - 10} ${cx + 9} ${cy + 3}`
          : `M${cx - 9} ${cy - 1} Q${cx} ${cy + 9} ${cx + 9} ${cy - 1}`;
        return (
          <Path
            key={s}
            d={d}
            fill="none"
            stroke={p.ink}
            strokeWidth={4.5}
            strokeLinecap="round"
          />
        );
      })}
    </>
  );
}

export function Brows({ p, mood, cfg }: FaceProps) {
  let outerDy = 0;
  let innerDy = 0;
  if (mood === 'hungry') {
    outerDy = 1;
    innerDy = -5;
  } else if (mood === 'thirsty') {
    outerDy = 0.5;
    innerDy = -3;
  } else if (mood === 'grumpy') {
    outerDy = -4;
    innerDy = 2;
  } else {
    return null;
  }
  const y = cfg.eyeY - (mood === 'grumpy' ? 15 : 19);
  return (
    <>
      {SIDES.map((s) => {
        const cx = 100 + s * cfg.eyeDx;
        return (
          <Path
            key={s}
            d={`M${cx + s * 11} ${y + outerDy} L${cx - s * 9} ${y + innerDy}`}
            stroke={p.outline}
            strokeWidth={4}
            strokeLinecap="round"
          />
        );
      })}
    </>
  );
}

function smile(m: number, depth: number, p: Palette) {
  return (
    <Path
      d={`M89 ${m} Q94.5 ${m + depth} 100 ${m} Q105.5 ${m + depth} 111 ${m}`}
      fill="none"
      stroke={p.outline}
      strokeWidth={3.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function openGrin(m: number, w: number, h: number, p: Palette) {
  return (
    <>
      <Path
        d={`M${100 - w} ${m} Q100 ${m + 3} ${100 + w} ${m} Q${100 + w - 1} ${m + h} 100 ${m + h} Q${100 - w + 1} ${m + h} ${100 - w} ${m} Z`}
        fill={p.mouthDark}
        stroke={p.outline}
        strokeWidth={3.6}
        strokeLinejoin="round"
      />
      <Ellipse cx={100} cy={m + h - 5} rx={w * 0.55} ry={5} fill={p.tongue} />
    </>
  );
}

/** Resting mouth for each mood. */
export function Mouth({ p, mood, cfg }: FaceProps) {
  const m = cfg.mouthY;
  const philtrum = (
    <Path
      d={`M100 ${m - 4} L100 ${m}`}
      stroke={p.outline}
      strokeWidth={3.4}
      strokeLinecap="round"
    />
  );
  switch (mood) {
    case 'happy':
      return (
        <>
          {philtrum}
          {openGrin(m, 14, 21, p)}
        </>
      );
    case 'restless':
      return (
        <>
          {philtrum}
          {openGrin(m, 12, 17, p)}
        </>
      );
    case 'hungry':
      return (
        <>
          {philtrum}
          <Ellipse
            cx={100}
            cy={m + 7}
            rx={6.5}
            ry={7.5}
            fill={p.mouthDark}
            stroke={p.outline}
            strokeWidth={3.4}
          />
          <Ellipse cx={100} cy={m + 11.5} rx={4} ry={2.5} fill={p.tongue} />
        </>
      );
    case 'thirsty':
      return (
        <>
          {philtrum}
          <Path
            d={`M93 ${m + 3} Q93 ${m + 19} 100 ${m + 19} Q107 ${m + 19} 107 ${m + 3} Z`}
            fill={p.tongue}
            stroke={p.outline}
            strokeWidth={3}
            strokeLinejoin="round"
          />
          <Path
            d={`M100 ${m + 6} L100 ${m + 13}`}
            stroke="#E8657F"
            strokeWidth={2}
            strokeLinecap="round"
          />
          {smile(m, 7, p)}
        </>
      );
    case 'grumpy':
      return (
        <>
          {philtrum}
          <Path
            d={`M91 ${m + 6} Q100 ${m - 1} 109 ${m + 6}`}
            fill="none"
            stroke={p.outline}
            strokeWidth={3.6}
            strokeLinecap="round"
          />
        </>
      );
    case 'sleepy':
      return (
        <>
          {philtrum}
          {smile(m, 5, p)}
        </>
      );
    default:
      return (
        <>
          {philtrum}
          {smile(m, 8, p)}
        </>
      );
  }
}

/** Overlay shown while chewing (eat reaction). */
export function ChewMouth({ p, cfg }: Pick<FaceProps, 'p' | 'cfg'>) {
  const m = cfg.mouthY;
  return (
    <>
      <Ellipse
        cx={100}
        cy={m + 9}
        rx={12}
        ry={10}
        fill={p.mouthDark}
        stroke={p.outline}
        strokeWidth={3.4}
      />
      <Ellipse cx={100} cy={m + 14} rx={7} ry={4} fill={p.tongue} />
    </>
  );
}

/** Tongue used by the drink reaction (laps in and out). */
export function LapTongue({ p, cfg }: Pick<FaceProps, 'p' | 'cfg'>) {
  const m = cfg.mouthY;
  return (
    <>
      <Path
        d={`M92 ${m + 3} Q92 ${m + 23} 100 ${m + 23} Q108 ${m + 23} 108 ${m + 3} Z`}
        fill={p.tongue}
        stroke={p.outline}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <Path
        d={`M100 ${m + 7} L100 ${m + 15}`}
        stroke="#E8657F"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </>
  );
}

/** Small mood extras drawn on the head (sweat drop when thirsty). */
export function Extras({ mood }: { mood: MascotMood }) {
  if (mood !== 'thirsty') return null;
  return (
    <Path
      d="M156 44 Q166 58 166 63 A10 10 0 0 1 146 63 Q146 58 156 44 Z"
      fill="#8CC6FA"
      stroke="#4C93D8"
      strokeWidth={2.5}
      strokeLinejoin="round"
    />
  );
}
