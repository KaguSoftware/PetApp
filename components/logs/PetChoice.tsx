import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Icon, type IconName } from "@/components/Icons";
import PetAvatar from "@/components/PetAvatar";
import { PressableScale } from "@/components/ui";
import { useReduceMotion } from "@/lib/a11y";
import type { CareTone } from "@/lib/careDashboard";
import type { Pet } from "@/lib/data";
import { font, radius, useColors, withAlpha, type Colors } from "@/lib/theme";

const ITEM_W = 76;

function ringColor(colors: Colors, tone: CareTone | undefined): string {
  switch (tone) {
    case "overdue":
      return colors.red;
    case "due":
      return colors.accent;
    case "open":
      return colors.orange;
    case "done":
      return colors.green;
    default:
      return "transparent";
  }
}

/**
 * The pet step, as a row of pets you can actually recognise. This is what
 * replaced the old always-on pet picker at the top of Logs: rather than making
 * everyone choose a pet before they can see anything, the choice moves into the
 * one moment it matters — and at 56pt with a name under it, it costs one
 * glance and one tap.
 *
 * Two modes. Given `selectedId` it behaves like a radio group (the retro-log
 * sheet); without one, each pet is a button that commits the action.
 */
export function PetChoiceRow({
  pets,
  onPress,
  selectedId,
  toneFor,
  captionFor,
  extra,
}: {
  pets: Pet[];
  onPress: (petId: string) => void;
  /** Selection mode: ring the chosen pet instead of coloring by care state. */
  selectedId?: string;
  toneFor?: (pet: Pet) => CareTone | undefined;
  captionFor?: (pet: Pet) => string | undefined;
  /** Trailing affordance — "All pets", "Add one", and friends. */
  extra?: { label: string; icon: IconName; onPress: () => void };
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  // A herd that fits shouldn't be inside a scroller — it steals vertical drags
  // from the page for no reason.
  const scrolls = pets.length + (extra ? 1 : 0) > 4;

  const items = (
    <>
      {pets.map((pet) => {
        const tone = toneFor?.(pet);
        const caption = captionFor?.(pet);
        const selected = selectedId === pet.id;
        const ring = selected ? colors.accent : ringColor(colors, tone);
        return (
          <PressableScale
            key={pet.id}
            haptic
            onPress={() => onPress(pet.id)}
            accessibilityRole="button"
            accessibilityLabel={pet.name}
            accessibilityHint={caption}
            accessibilityState={selectedId === undefined ? undefined : { selected }}
          >
            <View style={styles.item}>
              <View style={[styles.avatarRing, { borderColor: ring }, selected && { backgroundColor: colors.accentSoft }]}>
                <PetAvatar pet={pet} size="md" />
                {tone === "done" ? (
                  <View style={[styles.badge, { backgroundColor: colors.green }]}>
                    <Icon name="check" size={11} color={colors.white} strokeWidth={3} />
                  </View>
                ) : tone === "overdue" ? (
                  <View style={[styles.badge, { backgroundColor: colors.red }]}>
                    <Icon name="alert" size={11} color={colors.white} strokeWidth={2.4} />
                  </View>
                ) : null}
              </View>
              <Text numberOfLines={1} style={[styles.name, selected && { color: colors.label, fontFamily: font.semibold }]}>
                {pet.name}
              </Text>
              {caption ? (
                <Text numberOfLines={1} style={[styles.caption, tone && tone !== "idle" ? { color: ringColor(colors, tone) } : null]}>
                  {caption}
                </Text>
              ) : null}
            </View>
          </PressableScale>
        );
      })}
      {extra ? (
        <PressableScale haptic onPress={extra.onPress} accessibilityRole="button" accessibilityLabel={extra.label}>
          <View style={styles.item}>
            <View style={styles.extraDisc}>
              <Icon name={extra.icon} size={22} color={colors.accent} />
            </View>
            <Text numberOfLines={1} style={[styles.name, { color: colors.accent, fontFamily: font.semibold }]}>
              {extra.label}
            </Text>
          </View>
        </PressableScale>
      ) : null}
    </>
  );

  if (!scrolls) return <View style={styles.row}>{items}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {items}
    </ScrollView>
  );
}

/**
 * The chooser as it appears on the dashboard: a panel that opens directly under
 * the row of tiles, with a notch pointing back at the tile that opened it. It
 * is deliberately not a sheet — a modal would cover the very grid whose state
 * you are acting on, and the answer here is one tap away.
 */
export default function PetChoicePanel({
  title,
  caretSide,
  onDismiss,
  children,
}: {
  title: string;
  /** Which half of the row the originating tile sits in. */
  caretSide: "left" | "right";
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const reduceMotion = useReduceMotion();
  return (
    <Animated.View
      style={styles.panelWrap}
      entering={reduceMotion ? undefined : FadeIn.duration(160)}
      exiting={reduceMotion ? undefined : FadeOut.duration(120)}
    >
      <View style={[styles.caret, caretSide === "left" ? { left: "25%", marginLeft: -6 } : { right: "25%", marginRight: -6 }]} />
      <View style={styles.panel}>
        <View style={styles.panelHead}>
          <Text style={styles.panelTitle}>{title}</Text>
          <PressableScale onPress={onDismiss} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
            <View style={styles.close}>
              <Icon name="xmark" size={13} color={colors.label2} strokeWidth={2.4} />
            </View>
          </PressableScale>
        </View>
        {children}
      </View>
    </Animated.View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    row: { flexDirection: "row", gap: 4, paddingVertical: 2 },
    item: { width: ITEM_W, alignItems: "center", paddingVertical: 2 },
    avatarRing: { padding: 3, borderRadius: 34, borderWidth: 2 },
    badge: {
      position: "absolute",
      right: 0,
      bottom: 0,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.card,
    },
    name: { marginTop: 6, maxWidth: ITEM_W, fontSize: 13, fontFamily: font.medium, color: colors.label2, textAlign: "center" },
    caption: { marginTop: 1, maxWidth: ITEM_W, fontSize: 11, fontFamily: font.medium, color: colors.label3, textAlign: "center" },
    extraDisc: {
      width: 56,
      height: 56,
      marginVertical: 3,
      marginHorizontal: 3,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: withAlpha(colors.accent, 0.3),
    },
    panelWrap: { marginTop: 10 },
    caret: {
      position: "absolute",
      top: -5,
      width: 12,
      height: 12,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderColor: withAlpha(colors.accent, 0.4),
      transform: [{ rotate: "45deg" }],
      zIndex: 2,
    },
    panel: {
      borderRadius: radius.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: withAlpha(colors.accent, 0.4),
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 12,
    },
    panelHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, paddingLeft: 4 },
    panelTitle: { flex: 1, fontSize: 13, fontFamily: font.semibold, color: colors.label2 },
    close: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.fill },
  });
