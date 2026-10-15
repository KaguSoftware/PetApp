import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import type { Palette } from './palette';

interface FloatProps {
  progress: SharedValue<number>;
  /** Phase offset 0..1 (for looping icons). */
  offset?: number;
  /** Start position / size, in viewBox (200) units. */
  left: number;
  top: number;
  iconSize: number;
  rise: number;
  drift: number;
  unit: number;
  /** Reduced motion: fade in place instead of travelling. */
  still?: boolean;
  children: ReactNode;
}

/** An icon that fades in, floats up and fades out as `progress` goes 0 -> 1. */
export function FloatingIcon({
  progress,
  offset = 0,
  left,
  top,
  iconSize,
  rise,
  drift,
  unit,
  still,
  children,
}: FloatProps) {
  const style = useAnimatedStyle(() => {
    const t = (progress.value + offset) % 1;
    return {
      opacity: interpolate(t, [0, 0.15, 0.7, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: still ? 0 : Math.sin(t * Math.PI * 2) * drift * unit },
        { translateY: still ? 0 : -t * rise * unit },
        { scale: interpolate(t, [0, 0.2, 1], [0.5, 1, 1.1], Extrapolation.CLAMP) },
      ],
    };
  });
  const px = iconSize * unit;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.float,
        { left: left * unit - px / 2, top: top * unit - px / 2, width: px, height: px },
        style,
      ]}
    >
      <Svg width={px} height={px} viewBox="-12 -12 24 24">
        {children}
      </Svg>
    </Animated.View>
  );
}

export function HeartShape() {
  return (
    <Path
      d="M0 8 C-14 -2 -9 -13 0 -6 C9 -13 14 -2 0 8 Z"
      fill="#FF7A93"
      stroke="#D94F6E"
      strokeWidth={2}
      strokeLinejoin="round"
    />
  );
}

export function ZShape({ color }: { color: string }) {
  return (
    <Path
      d="M-5 -5 H5 L-5 5 H5"
      fill="none"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export type ThoughtKind = 'bowl' | 'leash';

/** Static thought bubble, drawn in the 200 viewBox, top-left corner. */
export function ThoughtBubble({ kind, p }: { kind: ThoughtKind; p: Palette }) {
  return (
    <>
      <Circle cx={24} cy={32} r={20} fill="#FFFDF8" stroke={p.outline} strokeWidth={3} />
      <Circle cx={42} cy={58} r={4.5} fill="#FFFDF8" stroke={p.outline} strokeWidth={2.5} />
      <Circle cx={48} cy={68} r={2.8} fill="#FFFDF8" stroke={p.outline} strokeWidth={2} />
      {kind === 'bowl' ? (
        <>
          <Path
            d="M12 30 H36 Q36 43 24 43 Q12 43 12 30 Z"
            fill="#FFC34D"
            stroke={p.outline}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          <Circle cx={19} cy={27} r={3.2} fill="#B9784A" />
          <Circle cx={25} cy={25} r={3.2} fill="#B9784A" />
          <Circle cx={30.5} cy={27.5} r={3.2} fill="#B9784A" />
        </>
      ) : (
        <>
          <Path
            d="M15 44 C10 28 18 20 24 22 C30 20 38 28 33 44"
            fill="none"
            stroke="#E5605A"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Ellipse cx={24} cy={45} rx={4} ry={3} fill="#E5605A" />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  float: { position: 'absolute' },
});
