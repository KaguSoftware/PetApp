import { useMemo, useState } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { actionTone, Icon } from "@/components/Icons";
import PetAvatar from "@/components/PetAvatar";
import type { DayMark, PetDay } from "@/lib/carePlan";
import { font, useColors, withAlpha, type Colors } from "@/lib/theme";

/** 6am to 10pm. The hours either side are dead space on every real household's
 *  day, and spending a third of the width on them shrinks the part that carries
 *  the marks. Anything outside clamps to an end. */
const START = 6 * 60;
const END = 22 * 60;

const MARK = 26;
/** Two marks closer than this overlap illegibly, so the later one is nudged. */
const MIN_GAP = MARK + 3;
const FACE = 28;
const FACE_GAP = 10;

function clock(minutes: number): string {
  const d = new Date();
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d.toLocaleTimeString([], minutes % 60 === 0 ? { hour: "numeric" } : { hour: "numeric", minute: "2-digit" });
}

/** Left to right, pushing each mark just far enough clear of the one before.
 *  Time is approximate on a sixteen-hour rail anyway; a pile-up is not. */
function place(marks: DayMark[], railWidth: number): { mark: DayMark; x: number }[] {
  let last = -Infinity;
  return marks.map((mark) => {
    const t = Math.min(1, Math.max(0, (mark.minutes - START) / (END - START)));
    const x = Math.max(MARK / 2 + t * Math.max(0, railWidth - MARK), last + MIN_GAP);
    last = x;
    return { mark, x };
  });
}

/**
 * Every pet's day, one row each, sharing one clock.
 *
 * This is where the icons went. They used to run down the left edge of every
 * row in the document below, which gave the page a second hard vertical
 * alignment and made four chapters read as four tables. Here the same glyphs
 * carry real information — *when* — instead of restating the label beside them.
 *
 * Rows share an axis so they can be compared: two pets fed at the same hour
 * line up, and a gap in the afternoon is a gap you can see. One line for the
 * current time crosses every row, which is what turns a stack of rails into a
 * single instrument.
 *
 * It is a figure, not a control. A mark is a time; the thing you would change
 * from it is a count or a cadence, which is a different question and lives in
 * the chapters below.
 */
export default function DayRail({
  days,
  tint,
  now,
  showFaces,
}: {
  days: PetDay[];
  tint: string;
  now: number;
  showFaces: boolean;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const inset = showFaces ? FACE + FACE_GAP : 0;
  const railWidth = Math.max(0, width - inset);

  const at = (minutes: number) => {
    const t = Math.min(1, Math.max(0, (minutes - START) / (END - START)));
    return MARK / 2 + t * Math.max(0, railWidth - MARK);
  };

  const nowMinutes = new Date(now).getHours() * 60 + new Date(now).getMinutes();
  const nowVisible = railWidth > 0 && nowMinutes >= START && nowMinutes <= END;

  const summary = days
    .map((d) => `${d.pet.name}: ${d.marks.length ? d.marks.map((m) => `${m.label} ${clock(m.minutes)}`).join(", ") : "no times set"}`)
    .join(". ");

  return (
    <View style={styles.wrap} onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={`Today's care times. ${summary}`}>
      <View style={styles.rows}>
        {nowVisible ? <View style={[styles.now, { left: inset + at(nowMinutes) - 0.5 }]} /> : null}
        {days.map((day) => (
          <View key={day.pet.id} style={styles.row}>
            {showFaces ? <PetAvatar pet={day.pet} size="xs" /> : null}
            <View style={styles.rail}>
              <View style={[styles.line, { backgroundColor: withAlpha(tint, 0.3) }]} />
              {/* A pet with no schedule still gets its row. Hiding it hid the
                  whole figure from the one person who most needed to learn the
                  day could have times in it. */}
              {day.marks.length === 0 ? (
                <View style={styles.blank}>
                  <Text style={styles.blankText}>No times set</Text>
                </View>
              ) : null}
              {railWidth > 0
                ? place(day.marks, railWidth).map(({ mark, x }) => {
                    const tone = actionTone(colors, mark.action);
                    return (
                      <View key={`${mark.action}-${mark.minutes}`} style={[styles.mark, { left: x - MARK / 2, backgroundColor: tone.bg }]}>
                        <Icon name={tone.icon} size={14} color={tone.tint} strokeWidth={1.9} />
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
    wrap: { marginTop: 22 },
    rows: { gap: 6 },
    row: { flexDirection: "row", alignItems: "center", gap: FACE_GAP, height: MARK },
    rail: { flex: 1, height: MARK, justifyContent: "center" },
    line: { height: StyleSheet.hairlineWidth, marginHorizontal: MARK / 2 },
    // Drawn over every row at once — one line through the stack is what makes
    // the rails read as a single instrument rather than as separate charts.
    now: { position: "absolute", top: -3, bottom: -3, width: 1, backgroundColor: withAlpha(colors.label, 0.3), zIndex: 2 },
    mark: {
      position: "absolute",
      width: MARK,
      height: MARK,
      borderRadius: MARK / 2,
      alignItems: "center",
      justifyContent: "center",
      // Painted on the page, not on a card — the rule runs behind it.
      borderWidth: 2,
      borderColor: colors.bg,
    },
    // Sits on the rule with the page colour behind it, exactly like a mark —
    // it reads as this row's content, not as a fault.
    blank: { position: "absolute", left: MARK / 2, backgroundColor: colors.bg, paddingHorizontal: 8 },
    blankText: { fontSize: 12, fontFamily: font.medium, color: colors.label3 },
    ends: { marginTop: 8, flexDirection: "row", justifyContent: "space-between" },
    end: { fontSize: 11, fontFamily: font.medium, color: colors.label3 },
  });
