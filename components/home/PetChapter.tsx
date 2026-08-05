import { Fragment, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { PressableScale } from "@/components/ui";
import type { CareTone } from "@/lib/careDashboard";
import type { ActionType } from "@/lib/data";
import type { NoteTint, PetLine, PetSection } from "@/lib/home";
import { font, radius, useColors, withAlpha, type Colors } from "@/lib/theme";

/**
 * Home's chapters are the animals.
 *
 * Care organises by rhythm, Inbox by horizon; both are right for what they ask.
 * Home asks "how is everyone", and the honest axis for that is the household
 * itself, one section per pet. It also means the page never has to ask which
 * pet you meant — the carousel this replaced put one animal on screen and hid
 * the rest behind a swipe, so a two-pet household could only ever see half of
 * itself at a time.
 *
 * The head is a name, a rule, and nothing else. The rule takes the pet's own
 * worst state, so "Luna is behind" is said by recolouring something already on
 * the page rather than by hanging a badge off her name.
 *
 * Inside, the scale steps twice. The levers that recur inside a day get full
 * rows at 17pt. Grooming, the last checkup and the cupboard run in underneath
 * as one line of prose at 14.5 — demoted rather than deleted, because you look
 * at the litter stock once a fortnight and it should cost a glance, not a row.
 */
export default function PetChapter({
  section,
  first,
  onOpenPet,
  onEditAge,
  onEditWeight,
  onPressLine,
}: {
  section: PetSection;
  /** The first chapter sits closer to the figure above it. */
  first: boolean;
  onOpenPet: () => void;
  onEditAge: () => void;
  onEditWeight: () => void;
  onPressLine: (type: ActionType) => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const RULE: Record<CareTone, string> = {
    overdue: colors.red,
    due: colors.orange,
    open: colors.accent,
    done: colors.label3,
    idle: colors.label3,
  };

  const { pet } = section;

  return (
    <View style={[styles.chapter, first && styles.chapterFirst]}>
      <PressableScale
        onPress={onOpenPet}
        accessibilityRole="header"
        accessibilityLabel={`${pet.name}, ${pet.breed}. Open profile.`}
        hitSlop={{ top: 8, bottom: 4, left: 4, right: 4 }}
      >
        <View style={styles.head}>
          <Text numberOfLines={1} style={styles.name}>
            {pet.name}
          </Text>
          <View style={[styles.rule, { backgroundColor: withAlpha(RULE[section.tone], 0.4) }]} />
        </View>
      </PressableScale>

      {/* Identity, run in. Age and weight are the two facts a family actually
          revises, so each is its own target — the number IS the control, the
          same bargain every value on the Care page makes. */}
      <View style={styles.meta}>
        <Text style={styles.metaTerm}>{section.breed}</Text>
        <Text style={styles.metaDot}>·</Text>
        <PressableScale
          haptic
          onPress={onEditAge}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel={`Age ${section.age}. Edit.`}
        >
          <Text style={styles.metaValue}>{section.age}</Text>
        </PressableScale>
        <Text style={styles.metaDot}>·</Text>
        <PressableScale
          haptic
          onPress={onEditWeight}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel={`Weight ${section.weight}. Edit.`}
        >
          <Text style={styles.metaValue}>{section.weight}</Text>
        </PressableScale>
      </View>

      {section.lines.map((line) => (
        <Line key={line.id} line={line} onPress={() => onPressLine(line.type)} />
      ))}

      <View style={styles.notes}>
        {section.notes.map((note, i) => (
          <Fragment key={note.id}>
            {i > 0 ? <Text style={styles.noteDot}>·</Text> : null}
            <View style={styles.note}>
              <Text style={styles.noteLabel}>{note.label}</Text>
              <Text style={[styles.noteValue, tintStyle(note.tint, colors)]}>{note.value}</Text>
            </View>
          </Fragment>
        ))}
      </View>
    </View>
  );
}

function tintStyle(tint: NoteTint, colors: Colors) {
  if (tint === "late") return { color: colors.red };
  if (tint === "warn") return { color: colors.orange };
  return undefined;
}

/**
 * One lever, one value — and the value logs it.
 *
 * The row is not a button; the number on the right is, which keeps the page a
 * document instead of a stack of controls. Small ink, big target: 30pt of
 * chip, another 10 of slop each way, so a thumb lands on it without the type
 * having to shout.
 */
function Line({ line, onPress }: { line: PetLine; onPress: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const ink =
    line.tone === "overdue"
      ? colors.red
      : line.tone === "due"
        ? colors.orange
        : line.tone === "done"
          ? colors.label3
          : colors.label;

  return (
    <View style={styles.line}>
      <Text numberOfLines={1} style={styles.lineLabel}>
        {line.label}
      </Text>
      <PressableScale
        haptic
        onPress={onPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 6 }}
        accessibilityRole="button"
        accessibilityLabel={`${line.label}, ${line.value}`}
        accessibilityHint="Logs this now"
      >
        <View style={styles.valueWrap}>
          <Text numberOfLines={1} style={[styles.value, { color: ink }]}>
            {line.value}
          </Text>
        </View>
      </PressableScale>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    chapter: { marginTop: 34 },
    chapterFirst: { marginTop: 30 },

    head: { flexDirection: "row", alignItems: "center", gap: 12 },
    // The one place on the page a proper noun is set large. Care's chapter
    // heads are 11.5pt uppercase categories; a name is not a category.
    name: { fontSize: 25, fontFamily: font.bold, letterSpacing: -0.5, color: colors.label, flexShrink: 1 },
    rule: { flex: 1, height: StyleSheet.hairlineWidth },

    meta: { marginTop: 5, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
    metaTerm: { fontSize: 14.5, fontFamily: font.regular, color: colors.label2 },
    metaValue: { fontSize: 14.5, fontFamily: font.semibold, color: colors.label },
    metaDot: { fontSize: 14.5, fontFamily: font.regular, color: colors.label3 },

    // No leading glyph, no separator between rows. Spacing is the separator;
    // the only rule in this chapter is the one beside the name.
    line: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 46, paddingVertical: 6 },
    lineLabel: { flexShrink: 1, fontSize: 17, fontFamily: font.medium, letterSpacing: -0.3, color: colors.label },
    valueWrap: { minHeight: 30, justifyContent: "center", borderRadius: radius.full },
    value: { fontSize: 17, fontFamily: font.semibold, letterSpacing: -0.2, textAlign: "right" },

    notes: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
    note: { flexDirection: "row", alignItems: "center", gap: 5 },
    noteLabel: { fontSize: 14, fontFamily: font.regular, color: colors.label3 },
    noteValue: { fontSize: 14, fontFamily: font.semibold, color: colors.label2 },
    noteDot: { fontSize: 14, fontFamily: font.regular, color: colors.label3 },
  });
