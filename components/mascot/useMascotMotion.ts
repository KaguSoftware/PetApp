import { useEffect, useRef } from 'react';
import type { ViewStyle } from 'react-native';
import {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type AnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/lib/a11y';
import { eyesAlwaysClosed } from './face';
import type { SpeciesArt } from './species';
import type { MascotMood, MascotReaction, MascotReactionType } from './types';

type AStyle = AnimatedStyle<ViewStyle>;

export interface MascotMotion {
  reduce: boolean;
  rootStyle: AStyle;
  bodyStyle: AStyle;
  headStyle: AStyle;
  tailStyle: AStyle;
  openEyesStyle: AStyle;
  closedEyesStyle: AStyle;
  mouthBaseStyle: AStyle;
  mouthChewStyle: AStyle;
  tongueStyle: AStyle;
  hearts: readonly [SharedValue<number>, SharedValue<number>, SharedValue<number>];
  zzz: SharedValue<number>;
}

interface Options {
  art: SpeciesArt;
  isCat: boolean;
  mood: MascotMood;
  reaction: MascotReaction | undefined;
  unit: number;
  animated: boolean;
}

const TAIL_MUL: Record<MascotMood, number> = {
  happy: 1,
  content: 0.7,
  hungry: 0.5,
  thirsty: 0.5,
  restless: 1.1,
  sleepy: 0.25,
  grumpy: 0.35,
};

const MOOD_TILT: Record<MascotMood, number> = {
  happy: 0,
  content: 0,
  hungry: -2,
  thirsty: 2,
  restless: 0,
  sleepy: 5,
  grumpy: 0,
};

function tailCycleMs(art: SpeciesArt, mood: MascotMood): number {
  const base = art.tail.ms;
  switch (mood) {
    case 'happy':
      return base * 0.5;
    case 'restless':
      return base * 0.2;
    case 'sleepy':
      return base * 2.8;
    case 'grumpy':
      return base * 1.8;
    case 'content':
      return base;
    default:
      return base * 1.3;
  }
}

/** All Mascot animation lives here: shared values + animated styles, no React state. */
export function useMascotMotion({ art, isCat, mood, reaction, unit, animated }: Options): MascotMotion {
  const systemReduce = useReducedMotion();
  const appReduce = useReduceMotion();
  const reduce = systemReduce || appReduce || !animated;

  const breath = useSharedValue(0);
  const tail = useSharedValue(0);
  const blink = useSharedValue(0);
  const shake = useSharedValue(0);
  const hop = useSharedValue(0);
  const squash = useSharedValue(0);
  const wig = useSharedValue(0);
  const dip = useSharedValue(0);
  const chew = useSharedValue(0);
  const tongue = useSharedValue(0);
  const squint = useSharedValue(0);
  const fx = useSharedValue(0);
  const zzz = useSharedValue(0);
  const h0 = useSharedValue(0);
  const h1 = useSharedValue(0);
  const h2 = useSharedValue(0);

  // ---- idle: breathing, tail, shake, Zzz ----
  useEffect(() => {
    cancelAnimation(breath);
    cancelAnimation(tail);
    cancelAnimation(shake);
    cancelAnimation(zzz);
    breath.value = 0;
    tail.value = 0;
    shake.value = 0;
    if (reduce) {
      zzz.value = 0.3;
      return;
    }
    const breathMs = mood === 'sleepy' ? 3400 : mood === 'restless' ? 1100 : 2000;
    breath.value = withRepeat(
      withTiming(1, { duration: breathMs, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    if (isCat && mood === 'restless') {
      // quick flick-flick, then a pause
      tail.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 110 }),
          withTiming(-0.6, { duration: 110 }),
          withTiming(1, { duration: 110 }),
          withTiming(0, { duration: 260 }),
          withTiming(0, { duration: 800 }),
        ),
        -1,
        false,
      );
    } else {
      tail.value = -1;
      tail.value = withRepeat(
        withTiming(1, { duration: tailCycleMs(art, mood), easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    }
    if (mood === 'restless' && art.shakesWhenRestless) {
      shake.value = withRepeat(
        withSequence(withTiming(1, { duration: 90 }), withTiming(-1, { duration: 90 })),
        -1,
        true,
      );
    }
    if (mood === 'sleepy') {
      zzz.value = 0;
      zzz.value = withRepeat(withTiming(1, { duration: 3600, easing: Easing.linear }), -1, false);
    }
    return () => {
      cancelAnimation(breath);
      cancelAnimation(tail);
      cancelAnimation(shake);
      cancelAnimation(zzz);
    };
  }, [reduce, mood, isCat, art, breath, tail, shake, zzz]);

  // ---- idle: random blink every 3-6s (timer only kicks the UI-thread animation) ----
  useEffect(() => {
    blink.value = 0;
    if (reduce || eyesAlwaysClosed(mood)) return;
    const slow = mood === 'content';
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        blink.value = withSequence(
          withTiming(1, { duration: slow ? 170 : 70 }),
          withDelay(slow ? 150 : 50, withTiming(0, { duration: slow ? 220 : 90 })),
        );
        schedule();
      }, 3000 + Math.random() * 3000);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [reduce, mood, blink]);

  // ---- reactions ----
  const rKey = reaction?.key;
  const rType: MascotReactionType | undefined = reaction?.type;
  const lastKey = useRef(rKey);
  useEffect(() => {
    if (rKey === undefined || rType === undefined || rKey === lastKey.current) return;
    lastKey.current = rKey;
    const all = [hop, squash, wig, dip, chew, tongue, squint, fx, h0, h1, h2];
    all.forEach((v) => {
      cancelAnimation(v);
      v.value = 0;
    });
    if (reduce) {
      fx.value = withSequence(withTiming(1, { duration: 140 }), withTiming(0, { duration: 220 }));
      if (rType === 'love') h0.value = withTiming(1, { duration: 1000 });
      return;
    }
    const outQ = Easing.out(Easing.quad);
    const inQ = Easing.in(Easing.quad);
    switch (rType) {
      case 'bounce':
        squint.value = withDelay(
          100,
          withSequence(withTiming(1, { duration: 120 }), withDelay(700, withTiming(0, { duration: 200 }))),
        );
        hop.value = withSequence(
          withDelay(120, withTiming(1, { duration: 230, easing: outQ })),
          withTiming(0, { duration: 200, easing: inQ }),
          withTiming(0.55, { duration: 170, easing: outQ }),
          withTiming(0, { duration: 160, easing: inQ }),
        );
        squash.value = withSequence(
          withTiming(-1, { duration: 120 }),
          withTiming(1, { duration: 200 }),
          withTiming(0, { duration: 200 }),
          withTiming(-0.8, { duration: 80 }),
          withTiming(0.4, { duration: 170 }),
          withSpring(0, { damping: 8, stiffness: 200 }),
        );
        break;
      case 'wiggle':
        wig.value = withSequence(
          withTiming(-1, { duration: 80 }),
          withRepeat(
            withSequence(withTiming(1, { duration: 130 }), withTiming(-1, { duration: 130 })),
            5,
            false,
          ),
          withTiming(0, { duration: 100 }),
        );
        squint.value = withSequence(
          withTiming(1, { duration: 100 }),
          withDelay(1100, withTiming(0, { duration: 200 })),
        );
        break;
      case 'love':
        [h0, h1, h2].forEach((h, i) => {
          h.value = withDelay(i * 260, withTiming(1, { duration: 1500, easing: Easing.linear }));
        });
        squint.value = withSequence(
          withTiming(1, { duration: 150 }),
          withDelay(1500, withTiming(0, { duration: 250 })),
        );
        hop.value = withSequence(
          withTiming(0.25, { duration: 160, easing: outQ }),
          withTiming(0, { duration: 200, easing: inQ }),
        );
        break;
      case 'eat':
        dip.value = withSequence(
          withTiming(1, { duration: 220 }),
          withRepeat(
            withSequence(withTiming(0.82, { duration: 110 }), withTiming(1, { duration: 110 })),
            3,
            false,
          ),
          withTiming(1, { duration: 150 }),
          withTiming(0, { duration: 280 }),
        );
        chew.value = withDelay(
          240,
          withRepeat(
            withSequence(withTiming(1, { duration: 110 }), withTiming(0, { duration: 110 })),
            3,
            false,
          ),
        );
        squint.value = withDelay(
          1050,
          withSequence(withTiming(1, { duration: 120 }), withDelay(500, withTiming(0, { duration: 200 }))),
        );
        break;
      case 'drink':
        dip.value = withSequence(
          withTiming(1, { duration: 260 }),
          withTiming(1, { duration: 1100 }),
          withTiming(0, { duration: 300 }),
        );
        tongue.value = withDelay(
          260,
          withSequence(
            withRepeat(
              withSequence(withTiming(1, { duration: 170 }), withTiming(0.15, { duration: 170 })),
              3,
              false,
            ),
            withTiming(0, { duration: 100 }),
          ),
        );
        break;
    }
  }, [rKey, rType, reduce, hop, squash, wig, dip, chew, tongue, squint, fx, h0, h1, h2]);

  // ---- styles ----
  const closed = eyesAlwaysClosed(mood);
  const tilt = MOOD_TILT[mood];
  const tailMul = TAIL_MUL[mood];
  const tailAmp = art.tail.amp * tailMul;
  const ox = (art.tail.pivot[0] - 100) * unit;
  const oy = (art.tail.pivot[1] - 100) * unit;
  const rootPivot = 80 * unit;
  const bodyPivot = 90 * unit;
  const neck = 22 * unit;

  const rootStyle = useAnimatedStyle(() => {
    const sq = squash.value;
    const sy = 1 + sq * 0.14 + fx.value * 0.05;
    const sx = 1 - sq * 0.1 + fx.value * 0.05;
    return {
      opacity: 1 - fx.value * 0.25,
      transform: [
        { translateY: -hop.value * 22 * unit },
        { translateY: rootPivot },
        { rotate: `${wig.value * 7 + shake.value * 1.8}deg` },
        { scaleX: sx },
        { scaleY: sy },
        { translateY: -rootPivot },
      ],
    };
  });

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bodyPivot },
      { scaleY: 1 + 0.03 * breath.value },
      { scaleX: 1 - 0.012 * breath.value },
      { translateY: -bodyPivot },
    ],
  }));

  const headStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -breath.value * 2.2 * unit + dip.value * 15 * unit },
      { translateY: neck },
      { rotate: `${tilt + dip.value * 3}deg` },
      { scale: 1 - dip.value * 0.03 },
      { translateY: -neck },
    ],
  }));

  const tailStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: ox },
      { translateY: oy },
      { rotate: `${tail.value * tailAmp}deg` },
      { translateX: -ox },
      { translateY: -oy },
    ],
  }));

  const closedOpacity = useAnimatedStyle(() => ({
    opacity: closed ? 1 : Math.max(blink.value, squint.value),
  }));
  const openOpacity = useAnimatedStyle(() => ({
    opacity: closed ? 0 : 1 - Math.max(blink.value, squint.value),
  }));
  const mouthBaseStyle = useAnimatedStyle(() => ({ opacity: 1 - chew.value }));
  const mouthChewStyle = useAnimatedStyle(() => ({ opacity: chew.value }));
  const tongueStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, tongue.value * 4),
    transform: [{ translateY: -(1 - tongue.value) * 5 * unit }],
  }));

  return {
    reduce,
    rootStyle,
    bodyStyle,
    headStyle,
    tailStyle,
    openEyesStyle: openOpacity,
    closedEyesStyle: closedOpacity,
    mouthBaseStyle,
    mouthChewStyle,
    tongueStyle,
    hearts: [h0, h1, h2],
    zzz,
  };
}
