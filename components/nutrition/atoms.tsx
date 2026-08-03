import { useEffect, useMemo } from "react";
import { StyleSheet, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { Icon, type IconName } from "@/components/Icons";
import { useReduceMotion } from "@/lib/a11y";
import { useStore } from "@/lib/store";
import { darkColors, font, radius, useColors, withAlpha, type Colors } from "@/lib/theme";

/**
 * Visual atoms for the Nutrition tab.
 *
 * This screen deliberately reads differently from the rest of the app — the
 * app's language is the iOS inset-grouped list, and a nutrition spec sheet is
 * not a settings page. What it does NOT do is invent colour: every value here
 * still resolves through `useColors()`/`withAlpha`, because a screen carrying
 * its own hex codes stops responding to the theme the moment dark mode lands.
 * The difference is composition, type scale and motion, not palette.
 */

/** Ease-out quint. All motion on this screen decelerates; nothing bounces. */
export const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);
export const REVEAL_MS = 620;

/* ── The ink panel ─────────────────────────────────────────────────────────── */

export interface InkSurface {
  bg: string;
  fg: string;
  fgDim: string;
  fgFaint: string;
  hairline: string;
  track: string;
  border: string;
  /** Accent tints that hold up against this surface — see the note below. */
  tint: { accent: string; green: string; orange: string; red: string };
}

/**
 * The instrument surface the daily spec is drawn on — the one place in the app
 * that inverts. In light mode it is the ink token used as a background, which
 * gives the numbers the authority of a printed spec sheet against a page of
 * white cards. In dark mode inverting again would mean going white, so it lifts
 * instead: card surface, accent hairline, brighter type.
 *
 * Either way the surface is DARK, which is why the tints always come from the
 * dark ramp. `lightColors.accent` is tuned for contrast against a white card and
 * goes muddy on ink; the dark ramp's brighter variants are the correct ones for
 * this surface in both themes.
 */
export function useInk(): InkSurface {
  const colors = useColors();
  const { resolvedTheme } = useStore();
  return useMemo(() => {
    const tint = {
      accent: darkColors.accentDeep,
      green: darkColors.green,
      orange: darkColors.orange,
      red: darkColors.red,
    };
    if (resolvedTheme === "dark") {
      return {
        bg: colors.card,
        fg: colors.label,
        fgDim: colors.label2,
        fgFaint: colors.label3,
        hairline: withAlpha(colors.label, 0.1),
        track: withAlpha(colors.label, 0.12),
        border: withAlpha(colors.accent, 0.28),
        tint,
      };
    }
    return {
      bg: colors.label,
      fg: colors.card,
      fgDim: withAlpha(colors.card, 0.68),
      fgFaint: withAlpha(colors.card, 0.45),
      hairline: withAlpha(colors.card, 0.12),
      track: withAlpha(colors.card, 0.14),
      border: "transparent",
      tint,
    };
  }, [colors, resolvedTheme]);
}

/* ── Animated number ───────────────────────────────────────────────────────── */

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/**
 * Locale separators, resolved ONCE on the JS thread.
 *
 * The count-up formats its own digits inside a worklet, and `toLocaleString` is
 * not something to call from the UI thread (see the worklet rules in
 * HANDOFF.md). Reading the separators here and passing them down as plain
 * strings keeps the worklet to indexing and concatenation while still printing
 * "1.234,56" for the people who write it that way.
 */
const SEPARATORS = (() => {
  try {
    const parts = new Intl.NumberFormat().formatToParts(12345.6);
    return {
      group: parts.find((p) => p.type === "group")?.value ?? ",",
      decimal: parts.find((p) => p.type === "decimal")?.value ?? ".",
    };
  } catch {
    return { group: ",", decimal: "." };
  }
})();

/** Worklet-safe thousands grouping. Called only from the UI thread. */
function group(digits: string, sep: string): string {
  "worklet";
  let out = "";
  let seen = 0;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    out = digits[i] + out;
    seen += 1;
    if (seen % 3 === 0 && i > 0) out = sep + out;
  }
  return out;
}

/** Worklet-safe fixed-decimal format with grouping. */
function fmt(value: number, decimals: number, groupSep: string, decSep: string): string {
  "worklet";
  // Hand-rolled finiteness test rather than `Number.isFinite`: everything this
  // worklet touches is a language primitive, so there is nothing here that can
  // fail to serialise onto the UI runtime. See the worklet rules in HANDOFF.md.
  const finite = value === value && value !== Infinity && value !== -Infinity;
  const safe = finite ? value : 0;
  const fixed = Math.abs(safe).toFixed(decimals);
  const dot = fixed.indexOf(".");
  const intPart = dot === -1 ? fixed : fixed.slice(0, dot);
  const fracPart = dot === -1 ? "" : fixed.slice(dot + 1);
  const sign = safe < 0 ? "-" : "";
  return sign + group(intPart, groupSep) + (fracPart ? decSep + fracPart : "");
}

/**
 * A number that rolls to its new value instead of swapping.
 *
 * This is the one piece of motion on the screen that carries information: when
 * a price or a pack size changes, watching the daily cost travel is what makes
 * the link between the input and the output legible. Everything it reads is
 * mirrored into a shared value first — the rule that keeps Reanimated from
 * taking the process down silently.
 */
export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 2,
  style,
  accessibilityLabel,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}) {
  const reduceMotion = useReduceMotion();
  const v = useSharedValue(value);
  const prefixSV = useSharedValue(prefix);
  const suffixSV = useSharedValue(suffix);
  const decSV = useSharedValue(decimals);
  const groupSV = useSharedValue(SEPARATORS.group);
  const decimalSV = useSharedValue(SEPARATORS.decimal);

  useEffect(() => {
    prefixSV.value = prefix;
  }, [prefix, prefixSV]);
  useEffect(() => {
    suffixSV.value = suffix;
  }, [suffix, suffixSV]);
  useEffect(() => {
    decSV.value = decimals;
  }, [decimals, decSV]);
  useEffect(() => {
    v.value = reduceMotion ? value : withTiming(value, { duration: 460, easing: EASE_OUT });
  }, [value, reduceMotion, v]);

  const animatedProps = useAnimatedProps(() => {
    "worklet";
    const text = prefixSV.value + fmt(v.value, decSV.value, groupSV.value, decimalSV.value) + suffixSV.value;
    // `text` is the native prop an uncontrolled TextInput updates from without a
    // React render — the standard way to drive text off the UI thread.
    return { text, defaultValue: text } as unknown as Record<string, unknown>;
  });

  const initial = prefix + fmt(value, decimals, SEPARATORS.group, SEPARATORS.decimal) + suffix;
  return (
    <AnimatedTextInput
      // Not an input: it never takes focus, never shows a caret, and reports
      // itself to screen readers as the text it is.
      editable={false}
      underlineColorAndroid="transparent"
      defaultValue={initial}
      animatedProps={animatedProps}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? initial}
      style={[styles.animatedNumberReset, style]}
    />
  );
}

/* ── Range bar ─────────────────────────────────────────────────────────────── */

/**
 * A target band drawn on a scale — "protein sits between 26% and 30% of a 60%
 * scale". The band is positioned with percentage layout (computed once, never
 * animated) and revealed by scaling a wrapper from its left edge, so the reveal
 * is a transform and the layout is settled before the first frame.
 */
export function RangeBar({
  min,
  max,
  scale,
  tint,
  track,
  delay = 0,
  height = 10,
}: {
  min: number;
  max: number;
  scale: number;
  tint: string;
  track: string;
  delay?: number;
  height?: number;
}) {
  const reduceMotion = useReduceMotion();
  const t = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) {
      t.value = 1;
      return;
    }
    t.value = withDelay(delay, withTiming(1, { duration: REVEAL_MS, easing: EASE_OUT }));
  }, [t, delay, reduceMotion]);

  const anim = useAnimatedStyle(() => ({ transform: [{ scaleX: t.value }] }));

  const left = `${Math.max(0, Math.min(100, (min / scale) * 100))}%` as const;
  const width = `${Math.max(2, Math.min(100, ((max - min) / scale) * 100))}%` as const;

  return (
    <View style={[styles.rangeTrack, { height, borderRadius: height / 2, backgroundColor: track }]}>
      <Animated.View style={[styles.rangeFillWrap, { left, width }, anim]}>
        <View style={{ flex: 1, borderRadius: height / 2, backgroundColor: tint }} />
      </Animated.View>
    </View>
  );
}

/* ── Reveal ────────────────────────────────────────────────────────────────── */

/** Fades and lifts a block into place on mount. Opacity + translate only. */
export function Reveal({ delay = 0, children, style }: { delay?: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduceMotion = useReduceMotion();
  const t = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) {
      t.value = 1;
      return;
    }
    t.value = withDelay(delay, withTiming(1, { duration: 460, easing: EASE_OUT }));
  }, [t, delay, reduceMotion]);
  const anim = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: (1 - t.value) * 10 }],
  }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

/* ── Small shared pieces ───────────────────────────────────────────────────── */

/** Uppercase micro-label. The screen's connective tissue. */
export function Eyebrow({ children, tint, style }: { children: React.ReactNode; tint?: string; style?: StyleProp<TextStyle> }) {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return <Text style={[s.eyebrow, tint ? { color: tint } : null, style]}>{children}</Text>;
}

/** Tone-coded pill with an icon — used for fit ratings and rule bands. */
export function TonePill({ icon, label, tint, bg }: { icon?: IconName; label: string; tint: string; bg: string }) {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[s.tonePill, { backgroundColor: bg }]}>
      {icon ? <Icon name={icon} size={12} color={tint} strokeWidth={2.4} /> : null}
      <Text style={[s.tonePillLabel, { color: tint }]}>{label}</Text>
    </View>
  );
}

/** Full-width hairline used to separate rows inside a panel. */
export function Hairline({ color, inset = 0 }: { color: string; inset?: number }) {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: color, marginLeft: inset }} />;
}

const styles = StyleSheet.create({
  // A TextInput brings its own padding, min-height and (on Android) an
  // underline. Zero all of it so the component measures exactly like a Text.
  animatedNumberReset: {
    padding: 0,
    margin: 0,
    borderWidth: 0,
    includeFontPadding: false,
    textAlignVertical: "center",
    // Style, not the prop: the `pointerEvents` prop is deprecated in RN 0.81.
    pointerEvents: "none",
  },
  rangeTrack: { width: "100%", overflow: "hidden" },
  rangeFillWrap: { position: "absolute", top: 0, bottom: 0, transformOrigin: "left" },
});

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    eyebrow: {
      fontSize: 11,
      fontFamily: font.bold,
      letterSpacing: 1.1,
      textTransform: "uppercase",
      color: colors.label3,
    },
    tonePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      alignSelf: "flex-start",
      borderRadius: radius.full,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    tonePillLabel: { fontSize: 11.5, fontFamily: font.bold, letterSpacing: 0.2 },
  });
