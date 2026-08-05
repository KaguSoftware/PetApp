import { Fragment, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Icon, type IconName } from "@/components/Icons";
import PetAvatar from "@/components/PetAvatar";
import { PressableScale } from "@/components/ui";
import type { PlanEntry, PlanLine } from "@/lib/carePlan";
import { font, radius, useColors, withAlpha, type Colors } from "@/lib/theme";

/**
 * How much page an item is worth.
 *
 * The four chapters used to be typographically identical, which is what made
 * them read as four stacked lists. They now thin as the rhythm slows: the day
 * is set large and airy, the week tighter, and everything past that runs in as
 * prose. It's an honest encoding — you look at the once-a-year items once a
 * year, so they get the weight of a footnote.
 */
export type Density = "day" | "week" | "runIn";

const SIZE: Record<Density, { label: number; value: number; row: number; pad: number }> = {
  day: { label: 19, value: 17, row: 52, pad: 9 },
  week: { label: 16, value: 15, row: 42, pad: 5 },
  runIn: { label: 14.5, value: 14.5, row: 0, pad: 0 },
};

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
 * The page's one button shape.
 *
 * A document with no containers gives a control nothing to be distinct
 * *against*, so links set as coloured text read as prose that happens to be
 * blue. These are unmistakable instead: a tinted stadium with its own border,
 * a 50pt body, and a chevron — the only rounded, filled things on the page.
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

/**
 * One care item, with one value per pet.
 *
 * The value is the control. `(Leo) 2×` is a whole target that opens Leo's
 * setting for this item, which is why nothing on this page ever has to ask
 * "which pet?" — the face is inside the button you already pressed.
 *
 * A household of one has nothing to disambiguate, so the face disappears and
 * the line collapses to a label and a number.
 */
export function PlanRow({
  line,
  tint,
  density,
  showFaces,
  onPick,
  onGuide,
}: {
  line: PlanLine;
  tint: string;
  density: "day" | "week";
  showFaces: boolean;
  onPick: (entry: PlanEntry) => void;
  onGuide: (guideId: string) => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const s = SIZE[density];
  return (
    <View style={[styles.row, { minHeight: s.row, paddingVertical: s.pad }]}>
      <Text numberOfLines={1} style={[styles.label, { fontSize: s.label }]}>
        {line.label}
      </Text>
      {/* The guide, one tap from the item it explains rather than four (chip →
          sheet → scroll → link). It trails the label instead of leading it, so
          it never forms a column of its own. */}
      {line.guideId ? (
        <PressableScale
          onPress={() => onGuide(line.guideId!)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`How to: ${line.label}`}
        >
          <View style={[styles.howTo, { backgroundColor: withAlpha(tint, 0.12), borderColor: withAlpha(tint, 0.3) }]}>
            <Text style={[styles.howToText, { color: tint }]}>how-to</Text>
          </View>
        </PressableScale>
      ) : null}
      <View style={styles.values}>
        {line.entries.map((entry) => (
          <ValueChip
            key={entry.pet.id}
            entry={entry}
            tint={tint}
            density={density}
            showFace={showFaces}
            onPress={() => onPick(entry)}
          />
        ))}
      </View>
    </View>
  );
}

function ValueChip({
  entry,
  tint,
  density,
  showFace,
  onPress,
}: {
  entry: PlanEntry;
  tint: string;
  density: Density;
  showFace: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const s = SIZE[density];
  // The one signal that a number is the family's rather than the plan's: it is
  // drawn in the chapter's colour instead of in ink. The sheet behind it says
  // what the plan suggested and offers the way back.
  const own = entry.suggested != null;
  const ink = own ? tint : colors.label;

  return (
    <PressableScale
      haptic
      onPress={onPress}
      // The chip has to sit inside a document line without turning the page
      // into a stack of buttons, so the target is made up in slop, not in ink.
      hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
      accessibilityRole="button"
      accessibilityLabel={showFace ? `${entry.pet.name}, ${entry.value}` : entry.value}
      accessibilityHint={own ? `Your number. The plan suggests ${entry.suggested}` : "Opens this item"}
    >
      <View style={[styles.chip, showFace && { backgroundColor: withAlpha(tint, 0.1), paddingLeft: 3, paddingRight: 11 }]}>
        {showFace ? <PetAvatar pet={entry.pet} size="xs" /> : null}
        <Text numberOfLines={1} style={[styles.value, { fontSize: s.value, color: ink }]}>
          {entry.value}
        </Text>
      </View>
    </PressableScale>
  );
}

/**
 * The slow chapters, set as prose.
 *
 * Nail trimming and vaccinations don't earn a row each. Run in, separated by
 * middots, they stop being a list and become the closing paragraphs of the
 * document — which is what an item you handle twice a year actually is.
 *
 * Prose can't carry a face without breaking, so pets are named in words here,
 * and only when they disagree: a value every pet shares is printed once.
 */
export function RunIn({
  lines,
  tint,
  onPick,
  onGuide,
}: {
  lines: PlanLine[];
  tint: string;
  onPick: (line: PlanLine, entry: PlanEntry) => void;
  onGuide: (guideId: string) => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.runIn}>
      {lines.map((line, i) => {
        const agreed = line.entries.every((e) => e.value === line.entries[0].value && e.suggested == null);
        const shown = agreed ? line.entries.slice(0, 1) : line.entries;
        return (
          <Fragment key={line.id}>
            {i > 0 ? <Text style={styles.runInDot}>·</Text> : null}
            <View style={styles.runInItem}>
              {/* A pill would litter a paragraph, so here the term itself is
                  the link — the same move a printed document makes. */}
              {line.guideId ? (
                <PressableScale
                  onPress={() => onGuide(line.guideId!)}
                  hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel={`How to: ${line.label}`}
                >
                  <Text style={[styles.runInLabel, styles.runInLinked]}>{line.label}</Text>
                </PressableScale>
              ) : (
                <Text style={styles.runInLabel}>{line.label}</Text>
              )}
              {shown.map((entry) => (
                <PressableScale
                  key={entry.pet.id}
                  haptic
                  onPress={() => onPick(line, entry)}
                  hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel={agreed ? `${line.label}, ${entry.value}` : `${line.label}, ${entry.pet.name}, ${entry.value}`}
                >
                  {/* Name muted, value in ink: without the contrast a line of
                      "Weight check Leo 1–2× a month Milo monthly" is one run of
                      undifferentiated words. */}
                  <Text style={[styles.runInValue, entry.suggested != null && { color: tint }]}>
                    {agreed ? null : <Text style={styles.runInWho}>{entry.pet.name} </Text>}
                    {entry.value}
                  </Text>
                </PressableScale>
              ))}
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    chapter: { marginTop: 32 },
    head: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
    headLabel: { fontSize: 11.5, fontFamily: font.bold, letterSpacing: 1.3 },
    rule: { flex: 1, height: StyleSheet.hairlineWidth },

    // No leading glyph and no separators. The icon column was a second hard
    // vertical alignment, and two vertical alignments make a table; the icons
    // now live on the day rail, where they carry a time instead of a repeat of
    // the label beside them.
    row: { flexDirection: "row", alignItems: "center", gap: 12 },
    label: { flexShrink: 1, fontFamily: font.medium, letterSpacing: -0.3, color: colors.label },
    values: { flex: 1, flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center", gap: 8 },

    chip: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 30, borderRadius: radius.full },
    howTo: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.full,
      borderWidth: StyleSheet.hairlineWidth,
    },
    howToText: { fontSize: 10.5, fontFamily: font.semibold, letterSpacing: 0.2 },
    value: { fontFamily: font.semibold, letterSpacing: -0.2 },

    runIn: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, paddingTop: 12 },
    runInItem: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
    runInLabel: { fontSize: SIZE.runIn.label, fontFamily: font.regular, color: colors.label2 },
    runInValue: { fontSize: SIZE.runIn.value, fontFamily: font.semibold, color: colors.label },
    runInWho: { fontFamily: font.regular, color: colors.label3 },
    runInLinked: { color: colors.accent, fontFamily: font.medium },
    runInDot: { fontSize: SIZE.runIn.label, fontFamily: font.regular, color: colors.label3 },

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
