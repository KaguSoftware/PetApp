import type { SpeciesKey } from './types';

export interface Palette {
  fur: string;
  furLight: string;
  furDark: string;
  belly: string;
  /** Same-hue dark outline. */
  outline: string;
  ink: string;
  innerEar: string;
  blush: string;
  mouthDark: string;
  tongue: string;
  nose: string;
}

export const DEFAULT_FUR: Record<SpeciesKey, string> = {
  dog: '#E8B07A',
  cat: '#B9BDCB',
  critter: '#C9B8EC',
};

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB | null {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex([r, g, b]: RGB): string {
  const c = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function rgbToHsl([r0, g0, b0]: RGB): [number, number, number] {
  const r = r0 / 255;
  const g = g0 / 255;
  const b = b0 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex([f(0) * 255, f(8) * 255, f(4) * 255]);
}

function mix(a: string, b: string, t: number): string {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return a;
  return rgbToHex([
    ra[0] + (rb[0] - ra[0]) * t,
    ra[1] + (rb[1] - ra[1]) * t,
    ra[2] + (rb[2] - ra[2]) * t,
  ]);
}

export function makePalette(furInput: string, fallback: string): Palette {
  const rgb = hexToRgb(furInput) ?? hexToRgb(fallback) ?? [232, 176, 122];
  const fur = rgbToHex(rgb);
  const [h, s, l] = rgbToHsl(rgb);
  return {
    fur,
    furLight: hslToHex(h, s, Math.min(l + 0.1, 0.93)),
    furDark: hslToHex(h, Math.min(s * 1.05, 1), Math.max(l - 0.13, 0.1)),
    belly: mix(fur, '#FFF6E6', 0.72),
    outline: hslToHex(h, Math.min(s, 0.5) * 0.9, 0.22),
    ink: '#2B2321',
    innerEar: '#FFB9C6',
    blush: '#FF8FA8',
    mouthDark: '#5B2A33',
    tongue: '#FF8FA3',
    nose: '#3A2A28',
  };
}
