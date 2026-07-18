import React, { useMemo } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Svg, { Rect } from "react-native-svg";

/**
 * Tiny pixel-art renderer, ported 1:1 from the web demo. A sprite is an array
 * of equal-length strings (rows); each character maps to a color via
 * `palette` (space / "." = transparent). Rendered as SVG <Rect> blocks with
 * horizontal run-length merging so it stays razor-sharp at any size.
 */
export type Sprite = { rows: string[]; palette: Record<string, string> };

function PixelSpriteInner({ sprite, size, style }: { sprite: Sprite; size: number; style?: StyleProp<ViewStyle> }) {
  const h = sprite.rows.length;
  const w = sprite.rows[0]?.length ?? 0;

  const rects = useMemo(() => {
    const out: { x: number; y: number; run: number; color: string }[] = [];
    for (let y = 0; y < h; y++) {
      const row = sprite.rows[y];
      let x = 0;
      while (x < w) {
        const ch = row[x];
        const color = sprite.palette[ch];
        if (!color || ch === " " || ch === ".") {
          x++;
          continue;
        }
        let run = 1;
        while (x + run < w && row[x + run] === ch) run++;
        out.push({ x, y, run, color });
        x += run;
      }
    }
    return out;
  }, [sprite, h, w]);

  if (w === 0) return null;
  return (
    <Svg width={size} height={(size / w) * h} viewBox={`0 0 ${w} ${h}`} style={style} pointerEvents="none">
      {rects.map((r) => (
        <Rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.run} height={1} fill={r.color} />
      ))}
    </Svg>
  );
}

const PixelSprite = React.memo(PixelSpriteInner);
export default PixelSprite;
