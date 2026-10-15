import { memo, useMemo, type ReactNode } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import Svg from 'react-native-svg';
import { FloatingIcon, HeartShape, ThoughtBubble, ZShape, type ThoughtKind } from './effects';
import { Brows, ChewMouth, ClosedEyes, Extras, Eyes, LapTongue, Mouth } from './face';
import { DEFAULT_FUR, makePalette, type Palette } from './palette';
import { SPECIES_ART, type SpeciesArt } from './species';
import { speciesKey, type MascotMood, type MascotProps } from './types';
import { useMascotMotion } from './useMascotMotion';

type LayerStyle = AnimatedStyle<ViewStyle>;

function Layer({ size, style, children }: { size: number; style?: LayerStyle; children: ReactNode }) {
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        {children}
      </Svg>
    </Animated.View>
  );
}

interface FaceLayerProps {
  art: SpeciesArt;
  p: Palette;
  mood: MascotMood;
}

const HeadBase = memo(function HeadBase({ art, p, mood, size }: FaceLayerProps & { size: number }) {
  const Head = art.Head;
  return (
    <Layer size={size}>
      <Head p={p} />
      <Brows p={p} mood={mood} cfg={art.face} />
      <Extras mood={mood} />
    </Layer>
  );
});

function thoughtFor(mood: MascotMood, dog: boolean): ThoughtKind | null {
  if (mood === 'hungry') return 'bowl';
  if (mood === 'restless' && dog) return 'leash';
  return null;
}

export function Mascot({
  species,
  mood = 'content',
  reaction,
  size = 200,
  tint,
  showThought = true,
  animated = true,
  accessibilityLabel,
}: MascotProps) {
  const key = speciesKey(species);
  const art = SPECIES_ART[key];
  const p = useMemo(() => makePalette(tint ?? DEFAULT_FUR[key], DEFAULT_FUR[key]), [tint, key]);
  const unit = size / 200;

  const m = useMascotMotion({ art, isCat: key === 'cat', mood, reaction, unit, animated });
  const { Tail, Body } = art;
  const thought = showThought ? thoughtFor(mood, key === 'dog') : null;

  return (
    <Animated.View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? `${species} mascot, feeling ${mood}`}
      style={[{ width: size, height: size }, m.rootStyle]}
    >
      <Layer size={size} style={m.tailStyle}>
        <Tail p={p} />
      </Layer>
      <Layer size={size} style={m.bodyStyle}>
        <Body p={p} />
      </Layer>

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, m.headStyle]}>
        <HeadBase art={art} p={p} mood={mood} size={size} />
        <Layer size={size} style={m.openEyesStyle}>
          <Eyes p={p} mood={mood} cfg={art.face} />
        </Layer>
        <Layer size={size} style={m.closedEyesStyle}>
          <ClosedEyes p={p} mood={mood} cfg={art.face} />
        </Layer>
        <Layer size={size} style={m.mouthBaseStyle}>
          <Mouth p={p} mood={mood} cfg={art.face} />
        </Layer>
        <Layer size={size} style={m.mouthChewStyle}>
          <ChewMouth p={p} cfg={art.face} />
        </Layer>
        <Layer size={size} style={m.tongueStyle}>
          <LapTongue p={p} cfg={art.face} />
        </Layer>
      </Animated.View>

      {thought ? (
        <Layer size={size}>
          <ThoughtBubble kind={thought} p={p} />
        </Layer>
      ) : null}

      {reaction?.type === 'love'
        ? [70, 100, 132].map((x, i) => (
            <FloatingIcon
              key={x}
              progress={m.hearts[i] ?? m.hearts[0]}
              left={x}
              top={62}
              iconSize={28}
              rise={78}
              drift={i === 1 ? -6 : 6}
              unit={unit}
              still={m.reduce}
            >
              <HeartShape />
            </FloatingIcon>
          ))
        : null}

      {mood === 'sleepy'
        ? [0, 1, 2].map((i) => (
            <FloatingIcon
              key={i}
              progress={m.zzz}
              offset={i / 3}
              left={142 + i * 7}
              top={52}
              iconSize={16 + i * 5}
              rise={34}
              drift={4}
              unit={unit}
              still={m.reduce}
            >
              <ZShape color="#7C8BD6" />
            </FloatingIcon>
          ))
        : null}
    </Animated.View>
  );
}

