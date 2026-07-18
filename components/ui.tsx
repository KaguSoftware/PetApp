import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { Icon, type IconName } from "@/components/Icons";
import PixelSprite from "@/components/pixel/PixelSprite";
import { COIN_SPRITE } from "@/components/pixel/hudSprites";
import { colors, font, radius } from "@/lib/theme";

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
}: {
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
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
      {trailing}
    </>
  );
  if (onPress)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.fill }]}>
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
  variant = "primary",
  size = "md",
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  variant?: "primary" | "tinted" | "gray";
  size?: "md" | "sm";
  style?: StyleProp<ViewStyle>;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const variantStyle = {
    primary: { backgroundColor: colors.accent },
    tinted: { backgroundColor: colors.accentSoft },
    gray: { backgroundColor: colors.fill },
  }[variant];
  const labelColor = { primary: "#fff", tinted: colors.accent, gray: colors.label }[variant];
  return (
    <Animated.View style={[anim, style]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => (scale.value = withTiming(0.97, { duration: 110, easing: Easing.out(Easing.quad) }))}
        onPressOut={() => (scale.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) }))}
        style={[styles.accentButton, size === "sm" ? styles.accentButtonSm : null, variantStyle, disabled && { opacity: 0.4 }]}
      >
        {typeof children === "string" ? (
          <Text style={[styles.accentButtonLabel, size === "sm" && { fontSize: 15 }, { color: labelColor }]}>{children}</Text>
        ) : (
          children
        )}
      </Pressable>
    </Animated.View>
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

export function CoinPill({ amount }: { amount: number }) {
  // Bump whenever the balance INCREASES — one place gives coin-earn feedback
  // for every source. Spending (a decrease) doesn't bump.
  const prev = useRef(amount);
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  useEffect(() => {
    if (amount > prev.current) {
      scale.value = withSequence(
        withTiming(1.18, { duration: 160, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) })
      );
    }
    prev.current = amount;
  }, [amount, scale]);
  return (
    <Animated.View style={[styles.coinPill, anim]}>
      <PixelSprite sprite={COIN_SPRITE} size={13} />
      <Text style={styles.coinPillLabel}>{amount.toLocaleString()}</Text>
    </Animated.View>
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
