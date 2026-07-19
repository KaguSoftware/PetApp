import * as Haptics from "expo-haptics";
import { forwardRef, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { Icon, type IconName } from "@/components/Icons";
import PixelSprite from "@/components/pixel/PixelSprite";
import { COIN_SPRITE } from "@/components/pixel/hudSprites";
import { hapticsEnabled, useReduceMotion } from "@/lib/a11y";
import { colors, font, radius } from "@/lib/theme";

/**
 * Press-feedback system — the standard iOS control behavior: the pressed
 * control DIMS smoothly while held (like every UIButton) and eases back on
 * release. No scaling, no bouncing, no opacity blinks. List rows use a
 * background fill highlight (Row below) instead.
 */
export const PRESS_SCALE = 0.97; // retained for API compatibility; no longer used
export const PRESS_SCALE_SMALL = 0.94;

export function PressableScale({
  scaleTo: _scaleTo,
  haptic = false,
  onPress,
  children,
  style,
  ...props
}: PressableProps & {
  /** @deprecated Press feedback is now the system dim; kept so call sites compile. */
  scaleTo?: number;
  /** Light impact on press (iOS). */
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const reduceMotion = useReduceMotion();
  const dim = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ opacity: dim.value }));
  return (
    // needsOffscreenAlphaCompositing: on Android, animating opacity over a child
    // with `elevation` (card shadow) otherwise leaks the shadow as a lighter
    // rectangle mid-press. Compositing the subtree to one layer fixes it so the
    // press is a clean, uniform dim.
    <Animated.View style={[anim, style]} needsOffscreenAlphaCompositing>
      <Pressable
        android_ripple={null}
        {...props}
        onPress={(e) => {
          if (haptic && Platform.OS === "ios" && hapticsEnabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress?.(e);
        }}
        onPressIn={(e) => {
          // Reduce Motion → snap the dim in with no easing animation.
          dim.value = reduceMotion ? 0.7 : withTiming(0.55, { duration: 90, easing: Easing.out(Easing.quad) });
          props.onPressIn?.(e);
        }}
        onPressOut={(e) => {
          dim.value = reduceMotion ? 1 : withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
          props.onPressOut?.(e);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/* Inset grouped list container (iOS Settings style) */
export function Group({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.group, style]}>{children}</View>;
}

export function SectionHeader({ children, trailing, style }: { children: React.ReactNode; trailing?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text style={styles.sectionHeaderText}>{typeof children === "string" ? children.toUpperCase() : children}</Text>
      {trailing}
    </View>
  );
}

export function IconCircle({
  icon,
  tint,
  bg,
  size = 36,
  iconSize = 19,
}: {
  icon: IconName;
  tint: string;
  bg: string;
  size?: number;
  iconSize?: number;
}) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} size={iconSize} color={tint} />
    </View>
  );
}

export function Row({
  leading,
  title,
  subtitle,
  trailing,
  onPress,
  destructive = false,
  switchValue,
  interactiveTrailing = false,
}: {
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  /**
   * Set when this row toggles a setting and carries a non-interactive Toggle in
   * `trailing` — the row is then announced as a switch with this state, which
   * the indicator itself can no longer report.
   */
  switchValue?: boolean;
  /**
   * Set when `trailing` holds its own button AND the row has an `onPress` that
   * does something different. `trailing` renders inside the row's Pressable, so
   * by default the row can swallow the button's taps (reliably on Android);
   * this hands the touch to the trailing subtree instead. Leave false for inert
   * trailing content (chevrons, counts) so the whole row stays tappable.
   */
  interactiveTrailing?: boolean;
}) {
  const inner = (
    <>
      {leading}
      <View style={styles.rowText}>
        {typeof title === "string" ? (
          <Text numberOfLines={1} style={[styles.rowTitle, destructive && { color: colors.red }]}>
            {title}
          </Text>
        ) : (
          title
        )}
        {subtitle != null &&
          (typeof subtitle === "string" ? (
            <Text numberOfLines={1} style={styles.rowSubtitle}>
              {subtitle}
            </Text>
          ) : (
            subtitle
          ))}
      </View>
      {/* flexShrink:0 — rowText is flex:1, so without this a wide trailing
          control wins the width contest and the numberOfLines={1} title
          collapses to nothing instead of the trailing shrinking.

          onStartShouldSetResponder claims the touch for the trailing subtree
          before the enclosing Row Pressable can take it, so an interactive
          trailing control (Edit, Book, a stepper) reliably wins its own taps
          instead of the row swallowing them — the usual Android failure. */}
      {trailing != null ? (
        <View style={styles.rowTrailing} onStartShouldSetResponder={() => interactiveTrailing}>
          {trailing}
        </View>
      ) : null}
    </>
  );
  if (onPress)
    return (
      // Simple uniform dim on press (no ripple, no background-fill rectangle) so
      // rows feel the same as every other pressable in the app.
      <Pressable
        android_ripple={null}
        onPress={onPress}
        accessibilityRole={switchValue === undefined ? "button" : "switch"}
        accessibilityState={switchValue === undefined ? undefined : { checked: switchValue }}
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.55 }]}
      >
        {inner}
      </Pressable>
    );
  return <View style={styles.row}>{inner}</View>;
}

/** Destructive Row that needs a second tap to confirm — arms for `armMs`, then reverts. */
export function ConfirmRow({
  label,
  confirmLabel,
  onConfirm,
  armMs = 3000,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  armMs?: number;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <Row
      destructive
      title={armed ? confirmLabel : label}
      onPress={() => {
        if (armed) {
          clearTimeout(timer.current);
          setArmed(false);
          onConfirm();
          return;
        }
        setArmed(true);
        timer.current = setTimeout(() => setArmed(false), armMs);
      }}
    />
  );
}

export function Chevron() {
  return <Icon name="chevron-right" size={15} color={colors.label3} />;
}

export function Separator({ inset = 16 }: { inset?: number }) {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.sep, marginLeft: inset }} />;
}

export function AccentButton({
  children,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  size = "md",
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  /** Shows a spinner (keeps height) and blocks presses — the ONE async-button pattern. */
  loading?: boolean;
  variant?: "primary" | "tinted" | "gray";
  size?: "md" | "sm";
  style?: StyleProp<ViewStyle>;
}) {
  const variantStyle = {
    primary: { backgroundColor: colors.accent },
    tinted: { backgroundColor: colors.accentSoft },
    gray: { backgroundColor: colors.fill },
  }[variant];
  const labelColor = { primary: colors.white, tinted: colors.accent, gray: colors.label }[variant];
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      style={style}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      <View
        style={[styles.accentButton, size === "sm" ? styles.accentButtonSm : null, variantStyle, disabled && !loading && { opacity: 0.4 }]}
      >
        {loading ? (
          <ActivityIndicator color={labelColor} />
        ) : typeof children === "string" ? (
          <Text style={[styles.accentButtonLabel, size === "sm" && { fontSize: 15 }, { color: labelColor }]}>{children}</Text>
        ) : (
          children
        )}
      </View>
    </PressableScale>
  );
}

export function Chip({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.chip, style]}>
      {typeof children === "string" ? <Text style={styles.chipLabel}>{children}</Text> : children}
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segment, active && styles.segmentActive]}>
            <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function CoinPill({ amount, onPress }: { amount: number; onPress?: () => void }) {
  // Bump whenever the balance INCREASES — one place gives coin-earn feedback
  // for every source. Spending (a decrease) doesn't bump.
  const reduceMotion = useReduceMotion();
  const prev = useRef(amount);
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  useEffect(() => {
    if (amount > prev.current && !reduceMotion) {
      scale.value = withSequence(
        withTiming(1.18, { duration: 160, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) })
      );
    }
    prev.current = amount;
  }, [amount, scale, reduceMotion]);
  const pill = (
    <Animated.View style={[styles.coinPill, anim]}>
      <PixelSprite sprite={COIN_SPRITE} size={13} />
      <Text style={styles.coinPillLabel}>{amount.toLocaleString()}</Text>
    </Animated.View>
  );
  if (!onPress) return pill;
  return (
    <PressableScale
      haptic
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${amount.toLocaleString()} coins. Spend them on your pets.`}
    >
      {pill}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  group: {
    borderRadius: radius.md,
    backgroundColor: colors.card,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.sep,
  },
  sectionHeader: { marginTop: 28, marginBottom: 9, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 4 },
  sectionHeaderText: { fontSize: 13, fontFamily: font.semibold, letterSpacing: 0.4, color: colors.label2 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 56 },
  rowText: { flex: 1, minWidth: 0, paddingVertical: 2 },
  rowTrailing: { flexShrink: 0 },
  rowTitle: { fontSize: 16, fontFamily: font.medium, color: colors.label },
  rowSubtitle: { fontSize: 13, fontFamily: font.regular, color: colors.label2, marginTop: 1 },
  accentButton: {
    height: 50,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  accentButtonSm: { height: 42 },
  accentButtonLabel: { fontSize: 17, fontFamily: font.semibold },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: radius.full, backgroundColor: colors.fill, paddingHorizontal: 10, paddingVertical: 4 },
  chipLabel: { fontSize: 12, fontFamily: font.medium, color: colors.label2 },
  segmented: { flexDirection: "row", borderRadius: 10, backgroundColor: colors.fill, padding: 2 },
  segment: { flex: 1, borderRadius: 8.5, paddingVertical: 6, alignItems: "center" },
  segmentActive: {
    backgroundColor: colors.card,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  segmentLabel: { fontSize: 13, fontFamily: font.semibold, color: colors.label2 },
  segmentLabelActive: { color: colors.label },
  coinPill: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: radius.full, backgroundColor: colors.orangeSoft, paddingHorizontal: 10, paddingVertical: 6 },
  coinPillLabel: { fontSize: 13, fontFamily: font.semibold, color: "#8a5a17", lineHeight: 14 },
});

/* ---------------------------------------------------------------------------
 * Sheet & form primitives — the single source of truth. Screens must NOT
 * declare local sheetTitle/input/fieldLabel/chip/toggle styles.
 * ------------------------------------------------------------------------- */

export function SheetTitle({ children }: { children: React.ReactNode }) {
  return <Text style={primStyles.sheetTitle}>{children}</Text>;
}

export function SheetSubtitle({ children }: { children: React.ReactNode }) {
  return <Text style={primStyles.sheetSubtitle}>{children}</Text>;
}

export function FieldLabel({ children }: { children: string }) {
  return <Text style={primStyles.fieldLabel}>{children}</Text>;
}

/** The one text input. Card bg, radius.md, 48pt min height, accent focus ring. */
export const TextField = forwardRef<TextInput, TextInputProps>(function TextField(props, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.label3}
      {...props}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      style={[primStyles.textField, focused && primStyles.textFieldFocused, props.style]}
    />
  );
});

export function SheetFooter({ children }: { children: React.ReactNode }) {
  return <View style={primStyles.sheetFooter}>{children}</View>;
}

/** Centered small-print under buttons/cards — replaces the four local footnote styles. */
export function Footnote({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Text style={[primStyles.footnote, style as object]}>{children}</Text>;
}

/**
 * The one selectable chip (filters, quick-adds, repeat options, portions…).
 * 44pt effective target (36pt visual + hitSlop), scale press, accent selected
 * state. Replaces Pill / filterChip / actionChip / speciesChip / cadencePill.
 */
export function SelectableChip({
  label,
  selected = false,
  onPress,
  disabled = false,
  leading,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  leading?: React.ReactNode;
}) {
  return (
    <PressableScale
      scaleTo={PRESS_SCALE_SMALL}
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
    >
      <View style={[primStyles.chipBase, selected ? primStyles.chipSelected : null, disabled && { opacity: 0.4 }]}>
        {leading}
        <Text style={[primStyles.chipBaseLabel, selected ? primStyles.chipSelectedLabel : null]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

/**
 * iOS-style switch, accent on-state, animated knob. The whole 51×31 control is
 * pressable by default.
 *
 * Pass `interactive={false}` when this sits in the `trailing` slot of a Row that
 * already has its own `onPress` — Row wraps `trailing` inside its Pressable, so
 * two live handlers on the same pixel fight: the pref flips and immediately
 * flips back, and the switch looks frozen. One owner per tap.
 */
export function Toggle({
  on,
  onChange,
  label,
  interactive = true,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  label?: string;
  interactive?: boolean;
}) {
  const t = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    t.value = withTiming(on ? 1 : 0, { duration: 180, easing: Easing.out(Easing.cubic) });
  }, [on, t]);
  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: t.value > 0.5 ? colors.accent : colors.fill,
  }));
  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: t.value * 20 }] }));
  const track = (
    <Animated.View style={[primStyles.toggleTrack, trackStyle]}>
      <Animated.View style={[primStyles.toggleKnob, knobStyle]} />
    </Animated.View>
  );
  // Purely visual: the enclosing Row owns the tap and announces the switch
  // state, so this must not register as a second touch target.
  if (!interactive) return <View pointerEvents="none">{track}</View>;
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS === "ios") Haptics.selectionAsync();
        onChange(!on);
      }}
      hitSlop={10}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
    >
      {track}
    </Pressable>
  );
}

/** Compact pill button for row-trailing actions (Book, Turn off, Edit) — 44pt effective target. */
export function SmallButton({
  label,
  onPress,
  tone = "accent",
  disabled = false,
}: {
  label: string;
  onPress?: () => void;
  tone?: "accent" | "red" | "green" | "gray";
  disabled?: boolean;
}) {
  const bg = { accent: colors.accentSoft, red: colors.redSoft, green: colors.greenSoft, gray: colors.fill }[tone];
  const fg = { accent: colors.accent, red: colors.red, green: colors.green, gray: colors.label }[tone];
  return (
    <PressableScale
      scaleTo={PRESS_SCALE_SMALL}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <View style={[primStyles.smallButton, { backgroundColor: bg }, disabled && { opacity: 0.4 }]}>
        <Text style={[primStyles.smallButtonLabel, { color: fg }]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

const primStyles = StyleSheet.create({
  sheetTitle: { fontSize: 20, fontFamily: font.bold, letterSpacing: -0.2, color: colors.label, paddingHorizontal: 4 },
  sheetSubtitle: { marginTop: 4, fontSize: 13, fontFamily: font.regular, lineHeight: 18, color: colors.label2, paddingHorizontal: 4 },
  fieldLabel: {
    fontSize: 12,
    fontFamily: font.semibold,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.label2,
    marginTop: 16,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  textField: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: font.medium,
    color: colors.label,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  textFieldFocused: { borderColor: colors.accent },
  sheetFooter: { marginTop: 24 },
  footnote: { marginTop: 10, textAlign: "center", fontSize: 12, fontFamily: font.regular, lineHeight: 17, color: colors.label3 },
  chipBase: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 36,
    borderRadius: radius.full,
    backgroundColor: colors.fill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipSelected: { backgroundColor: colors.accent },
  chipBaseLabel: { fontSize: 14, fontFamily: font.semibold, color: colors.label2 },
  chipSelectedLabel: { color: colors.white },
  toggleTrack: { width: 51, height: 31, borderRadius: 16, padding: 2, justifyContent: "center" },
  toggleKnob: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  smallButton: {
    minHeight: 36,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  smallButtonLabel: { fontSize: 14, fontFamily: font.semibold },
});
