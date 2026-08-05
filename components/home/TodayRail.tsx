import { useMemo, useState } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { actionTone, Icon } from "@/components/Icons";
import PetAvatar from "@/components/PetAvatar";
import { PressableScale } from "@/components/ui";
import type { Pet } from "@/lib/data";
import type { HomeDay, HomeMark } from "@/lib/home";
import { font, useColors, withAlpha, type Colors } from "@/lib/theme";

/** 6am to 10pm. The hours either side are dead space on every real household's
 *  day, and spending a third of the width on them shrinks the part that carries
 *  the marks. Anything outside clamps to an end. */
const START = 6 * 60;
const END = 22 * 60;

/** The disc, and the page-coloured ring around it that lets the rule pass
 *  behind rather than stop at it. */
const MARK = 26;
const HALO = 3;
const DISC = MARK + HALO * 2;
/** Two marks closer than this overlap illegibly, so the later one is nudged. */
const MIN_GAP = DISC + 2;
const FACE = 28;
const FACE_GAP = 10;

function clock(minutes: number): string {
  const d = new Date();
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d.toLocaleTimeString([], minutes % 60 === 0 ? { hour: "numeric" } : { hour: "numeric", minute: "2-digit" });
}

/** Left to right, pushing each mark just far enough clear of the one before.
 *  Time is approximate on a sixteen-hour rail anyway; a pile-up is not. */
function place(marks: HomeMark[], railWidth: number): { mark: HomeMark; x: number }[] {
  let last = -Infinity;
  return marks.map((mark) => {
    const t = Math.min(1, Math.max(0, (mark.minutes - START) / (END - START)));
    const x = Math.max(DISC / 2 + t * Math.max(0, railWidth - DISC), last + MIN_GAP);
    last = x;
    return { mark, x };
  });
}

/**
 * The day so far — every pet on one clock, with one line for now.
 *
 * The Care page has a rail too, and this is deliberately not it. There, a mark
 * is a time the family has SET: the plan, drawn whether or not anything has
 * happened. Here a mark is a time that HAS happened, been missed, or is still
 * coming, which is the only question a home screen is ever really asked. Care's
 * rail stays empty for a household that never opened the schedule editor; this
 * one fills the moment anybody logs anything, because unscheduled logs land on
 * it too.
 *
 * Three states, told in fill rather than in glyphs. Done is solid in the
 * action's own colour. Missed is washed red. Still-ahead is drawn in the page
 * colour behind a hairline, so the rule shows through it and the mark reads as
 * an outline of something not yet filled in. Nothing here gains a tick, a badge
 * or a second icon: the colour it already had is what changes.
 *
 * A figure, not a control. A mark is a moment; the thing you would do about it
 * is a log, and that lives one section down where the lever is named. Only the
 * faces are targets, and they go where a face should — to the animal.
 */
export default function TodayRail({
  days,
  now,
  showFaces,
  onPressPet,
}: {
  days: HomeDay[];
  now: number;
  showFaces: boolean;
  onPressPet: (pet: Pet) => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const inset = showFaces ? FACE + FACE_GAP : 0;
  const railWidth = Math.max(0, width - inset);

  const at = (minutes: number) => {
    const t = Math.min(1, Math.max(0, (minutes - START) / (END - START)));
    return DISC / 2 + t * Math.max(0, railWidth - DISC);
  };

  const nowMinutes = new Date(now).getHours() * 60 + new Date(now).getMinutes();
  const nowVisible = railWidth > 0 && nowMinutes >= START && nowMinutes <= END;

  const summary = days
    .map((d) => {
      if (d.marks.length === 0) return `${d.pet.name}: nothing logged`;
      const done = d.marks.filter((m) => m.state === "done").length;
      const missed = d.marks.filter((m) => m.state === "missed").length;
      return `${d.pet.name}: ${done} done, ${missed} missed, ${d.marks.length - done - missed} still ahead`;
    })
    .join(". ");

  return (
    <View style={styles.wrap} onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={`Today so far. ${summary}`}>
      <View style={styles.rows}>
        {/* One line through the whole stack, drawn once over every row — what
            turns a pile of rails into a single instrument. */}
        {nowVisible ? (
          <>
            <View style={[styles.now, { left: inset + at(nowMinutes) - 0.5 }]} />
            <View style={[styles.nowLabel, { left: inset + at(nowMinutes) - 16 }]}>
              <Text style={styles.nowLabelText}>NOW</Text>
            </View>
          </>
        ) : null}
        {days.map((day) => (
          <View key={day.pet.id} style={styles.row}>
            {showFaces ? (
              <PressableScale
                onPress={() => onPressPet(day.pet)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${day.pet.name}`}
                hitSlop={10}
                overflowsBounds
              >
                <PetAvatar pet={day.pet} size="xs" />
              </PressableScale>
            ) : null}
            <View style={styles.rail}>
              <View style={styles.line} />
              {/* A pet with nothing yet still gets its row, and the words sit ON
                  the rule in the page colour — content, not a gap. */}
              {day.marks.length === 0 ? (
                <View style={styles.blank}>
                  <Text style={styles.blankText}>Nothing logged yet</Text>
                </View>
              ) : null}
              {railWidth > 0
                ? place(day.marks, railWidth).map(({ mark, x }) => {
                    const tone = actionTone(colors, mark.action);
                    const done = mark.state === "done";
                    const missed = mark.state === "missed";
                    return (
                      <View key={mark.key} style={[styles.halo, { left: x - DISC / 2 }]}>
                        <View
                          style={[
                            styles.mark,
                            done && { backgroundColor: tone.bg, borderColor: withAlpha(tone.tint, 0.22) },
                            missed && { backgroundColor: colors.redSoft, borderColor: withAlpha(colors.red, 0.45) },
                            !done && !missed && { borderColor: withAlpha(tone.tint, 0.34) },
                          ]}
                        >
                          <Icon
                            name={tone.icon}
                            size={14}
                            color={missed ? colors.red : done ? tone.tint : withAlpha(tone.tint, 0.55)}
                            strokeWidth={1.9}
                          />
                        </View>
                      </View>
                    );
                  })
                : null}
            </View>
          </View>
        ))}
      </View>
      <View style={[styles.ends, { paddingLeft: inset }]}>
        <Text style={styles.end}>{clock(START)}</Text>
        <Text style={styles.end}>{clock(END)}</Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    wrap: { marginTop: 16 },
    // The NOW cap and the line it belongs to are drawn INSIDE this box (hence
    // the padding) rather than hanging above the first row on a negative top.
    // A child laid out outside its parent is a rendering coin-flip on Android
    // and can't be touched at all there — see the hat-slot fix in HANDOFF.
    rows: { gap: 8, paddingTop: 15, paddingBottom: 3 },
    row: { flexDirection: "row", alignItems: "center", gap: FACE_GAP, height: DISC },
    rail: { flex: 1, height: DISC, justifyContent: "center" },
    line: { height: StyleSheet.hairlineWidth, marginHorizontal: DISC / 2, backgroundColor: colors.sep },
    now: { position: "absolute", top: 13, bottom: 0, width: 1, backgroundColor: withAlpha(colors.label, 0.3), zIndex: 2 },
    nowLabel: { position: "absolute", top: 0, width: 32, alignItems: "center", zIndex: 2 },
    nowLabelText: { fontSize: 9, fontFamily: font.bold, letterSpacing: 0.8, color: withAlpha(colors.label, 0.4) },
    // The page-coloured ring. Its only job is to let the rule run behind the
    // disc; the disc inside it carries the state.
    halo: {
      position: "absolute",
      width: DISC,
      height: DISC,
      borderRadius: DISC / 2,
      backgroundColor: colors.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    // Every state carries the same hairline, so changing a fill can never shift
    // the geometry by half a point.
    mark: {
      width: MARK,
      height: MARK,
      borderRadius: MARK / 2,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "transparent",
    },
    blank: { position: "absolute", left: DISC / 2, backgroundColor: colors.bg, paddingHorizontal: 8 },
    blankText: { fontSize: 12, fontFamily: font.medium, color: colors.label3 },
    ends: { marginTop: 10, flexDirection: "row", justifyContent: "space-between" },
    end: { fontSize: 11, fontFamily: font.medium, color: colors.label3 },
  });
