import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Icon, type IconName } from "@/components/Icons";
import { PressableScale } from "@/components/ui";
import { font, radius, useColors, withAlpha, type Colors } from "@/lib/theme";

export function Chapter({ label, tint, children }: { label: string; tint: string; children: React.ReactNode }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.chapter}>
      <View style={styles.head} accessibilityRole="header">
        <Text style={[styles.headLabel, { color: tint }]}>{label.toUpperCase()}</Text>
        <View style={[styles.rule, { backgroundColor: withAlpha(tint, 0.28) }]} />
      </View>
      {children}
    </View>
  );
}

/**
 * The shared button shape for page-level links (Home, Inbox and Care all use
 * it): a tinted stadium with its own border, a 50pt body, and a chevron.
 */
export function PageButton({
  label,
  tint,
  icon,
  count,
  onPress,
  full = false,
  size = "md",
  chevron = true,
  expanded,
}: {
  label: string;
  tint: string;
  icon?: IconName;
  count?: number;
  onPress: () => void;
  /** Stretch to the container and push the chevron to the far edge. */
  full?: boolean;
  size?: "md" | "sm";
  chevron?: boolean;
  /** Set when the button discloses something in place — rotates the chevron. */
  expanded?: boolean;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const small = size === "sm";
  return (
    <PressableScale
      haptic
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={count != null && count > 0 ? `${label}, ${count}` : label}
      accessibilityState={expanded == null ? undefined : { expanded }}
    >
      <View
        style={[
          styles.button,
          small && styles.buttonSm,
          { backgroundColor: withAlpha(tint, 0.11), borderColor: withAlpha(tint, 0.34) },
        ]}
      >
        {icon ? <Icon name={icon} size={small ? 15 : 18} color={tint} strokeWidth={1.9} /> : null}
        <Text style={[styles.buttonLabel, small && styles.buttonLabelSm, { color: tint }]}>{label}</Text>
        {count != null && count > 0 ? (
          <View style={[styles.badge, { backgroundColor: withAlpha(tint, 0.2) }]}>
            <Text style={[styles.badgeText, { color: tint }]}>{count}</Text>
          </View>
        ) : null}
        {full ? <View style={{ flex: 1 }} /> : null}
        {chevron ? (
          <View style={expanded ? { transform: [{ rotate: "90deg" }] } : undefined}>
            <Icon name="chevron-right" size={small ? 13 : 15} color={tint} strokeWidth={2.2} />
          </View>
        ) : null}
      </View>
    </PressableScale>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    chapter: { marginTop: 32 },
    head: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
    headLabel: { fontSize: 11.5, fontFamily: font.bold, letterSpacing: 1.3 },
    rule: { flex: 1, height: StyleSheet.hairlineWidth },

    button: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      minHeight: 50,
      paddingHorizontal: 18,
      borderRadius: radius.full,
      borderWidth: StyleSheet.hairlineWidth,
    },
    buttonSm: { minHeight: 36, paddingHorizontal: 14, gap: 7 },
    buttonLabel: { fontSize: 15, fontFamily: font.semibold, letterSpacing: -0.2 },
    buttonLabelSm: { fontSize: 13.5 },
    badge: { minWidth: 20, paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.full, alignItems: "center" },
    badgeText: { fontSize: 12, fontFamily: font.bold },
  });
