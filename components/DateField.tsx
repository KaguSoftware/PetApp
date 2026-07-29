import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icons";
import { FadeInView } from "@/components/Motion";
import { PressableScale, SelectableChip } from "@/components/ui";
import { cardShadow, font, radius, useColors, withAlpha, type Colors } from "@/lib/theme";

/**
 * The one date input used across sheets (birth date, vaccination dates, vet
 * visits, breeding, reminders).
 *
 * This is a CUSTOM month-grid calendar — the same one the web demo draws
 * (`components/StreakCalendarSheet.tsx` there and here): single-letter weekday
 * headers, a centred "Month Year" title between two round chevron buttons, and
 * round day cells. Selection is an accent-filled disc, today is an accent ring.
 * It replaced the platform picker (`@react-native-community/datetimepicker`)
 * deliberately — that was an iOS wheel spinner on one platform and a Material
 * dialog on the other, so the same field looked like three different products
 * across web/iOS/Android. Nothing imports the native picker any more; there is
 * no platform fork in here at all.
 *
 * Tapping the title drills out — days → months → years — which the wheel gave
 * for free and a bare calendar does not. Without it a 12-year-old cat's birth
 * date is 144 taps on the back chevron; with it, three.
 *
 * `value` is a noon timestamp (or null); `onChange` gets the same. Every site
 * imports this — there is no per-screen copy, so the calendar stays identical
 * everywhere.
 */

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Seven columns; the cell is the tap target, the disc inside it is the paint. */
const CELL_PCT = `${100 / 7}%` as const;
/** Always draw six week rows so the card doesn't change height between months. */
const GRID_CELLS = 42;
/** Years shown per page in the year grid (a 3×4 grid, same shape as the months). */
const YEAR_PAGE = 12;

/**
 * How far the calendar reaches, per direction. 100 back rather than something
 * dog-shaped: this field also takes parrot and tortoise birth dates, and a
 * clamp the owner can't argue with is worse than a long scroll they never use.
 */
const YEARS_BACK = 100;
const YEARS_FORWARD = 20;

/** Normalise to local noon so DST / timezone shifts can't bump the calendar day. */
function atNoon(d: Date) {
  const c = new Date(d);
  c.setHours(12, 0, 0, 0);
  return c.getTime();
}

function dayTs(y: number, m: number, day: number) {
  return atNoon(new Date(y, m, day));
}

function shiftMonths(now: number, months: number) {
  const d = new Date(now);
  d.setMonth(d.getMonth() + months);
  return atNoon(d);
}

function shiftYears(now: number, years: number) {
  const d = new Date(now);
  d.setFullYear(d.getFullYear() + years);
  return atNoon(d);
}

function shiftDays(ts: number, n: number) {
  const d = new Date(ts);
  d.setDate(d.getDate() + n);
  return atNoon(d);
}

function monthOf(ts: number) {
  const d = new Date(ts);
  return { y: d.getFullYear(), m: d.getMonth() };
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

/** Top-left year of the 12-year page holding `y`, anchored so pages never drift. */
function yearPageStart(y: number) {
  return Math.floor(y / YEAR_PAGE) * YEAR_PAGE;
}

type View3 = "days" | "months" | "years";

export type DateFieldMode = "past" | "future";

export default function DateField({
  value,
  onChange,
  mode = "past",
  allowClear = false,
  showChips = true,
}: {
  value: number | null;
  onChange: (ts: number | null) => void;
  mode?: DateFieldMode;
  allowClear?: boolean;
  /**
   * The quick-jump chips under the calendar ("1 wk ago", "In 3 mo", …). Off for
   * birth dates, where relative offsets from today are never the answer — a
   * pet born "1 week ago" or "6 months ago" is a coincidence, not a shortcut,
   * so the chips are noise there. `allowClear` still renders its "None" chip.
   */
  showChips?: boolean;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const today = atNoon(new Date());

  // Constrain the calendar so a "past" field can't reach into the future and a
  // "future" field can't reach into the past.
  const minTs = mode === "future" ? today : shiftYears(today, -YEARS_BACK);
  const maxTs = mode === "past" ? today : shiftYears(today, YEARS_FORWARD);
  const minYear = new Date(minTs).getFullYear();
  const maxYear = new Date(maxTs).getFullYear();

  const [view, setView] = useState<View3>("days");
  const [cursor, setCursor] = useState(() => monthOf(value ?? today));

  // Follow the value when it's set from outside the grid (a quick-jump chip, or
  // a sheet reopening on a different record) — but stay put when the tap landed
  // on a day already on screen, which is the common case.
  useEffect(() => {
    if (value == null) return;
    const next = monthOf(value);
    setCursor((c) => (c.y === next.y && c.m === next.m ? c : next));
  }, [value]);

  const chips: { label: string; ts: number }[] =
    mode === "past"
      ? [
          { label: "Today", ts: today },
          { label: "1 wk ago", ts: shiftDays(today, -7) },
          { label: "1 mo ago", ts: shiftMonths(today, -1) },
          { label: "6 mo ago", ts: shiftMonths(today, -6) },
          { label: "1 yr ago", ts: shiftYears(today, -1) },
        ]
      : [
          { label: "In 1 mo", ts: shiftMonths(today, 1) },
          { label: "In 3 mo", ts: shiftMonths(today, 3) },
          { label: "In 6 mo", ts: shiftMonths(today, 6) },
          { label: "In 1 yr", ts: shiftYears(today, 1) },
          { label: "In 3 yrs", ts: shiftYears(today, 3) },
        ];

  const cells = useMemo(() => {
    const { y, m } = cursor;
    const total = daysInMonth(y, m);
    const lead = new Date(y, m, 1).getDay();
    const out: (number | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= total; d++) out.push(d);
    while (out.length < GRID_CELLS) out.push(null);
    return out;
  }, [cursor]);

  // A month/year is reachable only if any day in it falls inside [minTs, maxTs].
  const monthInRange = (y: number, m: number) =>
    dayTs(y, m, daysInMonth(y, m)) >= minTs && dayTs(y, m, 1) <= maxTs;
  const yearInRange = (y: number) => y >= minYear && y <= maxYear;

  /**
   * Carry the cursor's month into a newly picked year, walking outward to the
   * nearest reachable month when that year is the clamped end of the range —
   * jumping to this year on a "past" field with the cursor on December must
   * land on the last allowed month, not on a month with every day disabled.
   * A year pill is only tappable when `yearInRange`, so a hit always exists.
   */
  const clampMonth = (y: number, m: number) => {
    if (monthInRange(y, m)) return m;
    for (let d = 1; d < 12; d++) {
      if (m - d >= 0 && monthInRange(y, m - d)) return m - d;
      if (m + d <= 11 && monthInRange(y, m + d)) return m + d;
    }
    return m;
  };

  const prevMonth = cursor.m === 0 ? { y: cursor.y - 1, m: 11 } : { y: cursor.y, m: cursor.m - 1 };
  const nextMonth = cursor.m === 11 ? { y: cursor.y + 1, m: 0 } : { y: cursor.y, m: cursor.m + 1 };

  const pageStart = yearPageStart(cursor.y);
  const years = useMemo(
    () => Array.from({ length: YEAR_PAGE }, (_, i) => pageStart + i),
    [pageStart]
  );

  const selected = value != null ? monthOf(value) : null;
  const selectedDay = value != null ? new Date(value).getDate() : null;
  const todayParts = monthOf(today);
  const todayDay = new Date(today).getDate();

  const header: { label: string; back: boolean; fwd: boolean } =
    view === "days"
      ? {
          label: `${MONTH_NAMES[cursor.m]} ${cursor.y}`,
          back: monthInRange(prevMonth.y, prevMonth.m),
          fwd: monthInRange(nextMonth.y, nextMonth.m),
        }
      : view === "months"
        ? { label: `${cursor.y}`, back: yearInRange(cursor.y - 1), fwd: yearInRange(cursor.y + 1) }
        : {
            label: `${pageStart} – ${pageStart + YEAR_PAGE - 1}`,
            back: yearInRange(pageStart - 1),
            fwd: yearInRange(pageStart + YEAR_PAGE),
          };

  const stepLabel = view === "days" ? "month" : view === "months" ? "year" : "year range";

  const step = (dir: -1 | 1) => {
    if (view === "days") {
      setCursor(dir === -1 ? prevMonth : nextMonth);
      return;
    }
    // Both drill-out views move the cursor's YEAR; the year grid just moves it a
    // page at a time. Clamped so the cursor can't land outside the field's range.
    const delta = view === "months" ? dir : dir * YEAR_PAGE;
    setCursor((c) => ({ ...c, y: Math.min(maxYear, Math.max(minYear, c.y + delta)) }));
  };

  /** Title press drills out one level; from the last level it returns to days. */
  const drill = () => setView((v) => (v === "days" ? "months" : v === "months" ? "years" : "days"));

  return (
    <View>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <PressableScale
            onPress={() => step(-1)}
            disabled={!header.back}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Previous ${stepLabel}`}
            accessibilityState={{ disabled: !header.back }}
          >
            <View style={[styles.navButton, !header.back && styles.navDisabled]}>
              <Icon name="chevron-left" size={14} color={colors.label} />
            </View>
          </PressableScale>

          <PressableScale
            onPress={drill}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={
              view === "days"
                ? `${header.label} — choose a different month`
                : view === "months"
                  ? `${header.label} — choose a different year`
                  : `${header.label} — back to days`
            }
          >
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>{header.label}</Text>
              <Icon name={view === "years" ? "chevron-up" : "chevron-down"} size={13} color={colors.accent} />
            </View>
          </PressableScale>

          <PressableScale
            onPress={() => step(1)}
            disabled={!header.fwd}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Next ${stepLabel}`}
            accessibilityState={{ disabled: !header.fwd }}
          >
            <View style={[styles.navButton, !header.fwd && styles.navDisabled]}>
              <Icon name="chevron-right" size={14} color={colors.label} />
            </View>
          </PressableScale>
        </View>

        {/* Each pane is keyed so a change fades the new one in. Entering only —
            an exit animation would keep the outgoing pane mounted and stack the
            two, jolting the card's height mid-swap. */}
        {view === "days" ? (
          <FadeInView key={`d-${cursor.y}-${cursor.m}`} duration={160}>
            <View style={styles.grid}>
              {WEEKDAY_LABELS.map((d, i) => (
                <View key={`w${i}`} style={styles.weekdayCell}>
                  <Text style={styles.weekday}>{d}</Text>
                </View>
              ))}
              {cells.map((day, i) => {
                if (day == null) return <View key={`b${i}`} style={styles.cell} />;
                const ts = dayTs(cursor.y, cursor.m, day);
                const disabled = ts < minTs || ts > maxTs;
                const isSelected =
                  selected != null && selected.y === cursor.y && selected.m === cursor.m && selectedDay === day;
                const isToday = todayParts.y === cursor.y && todayParts.m === cursor.m && todayDay === day;
                return (
                  <PressableScale
                    key={`d${day}`}
                    style={styles.cell}
                    onPress={() => onChange(ts)}
                    disabled={disabled}
                    haptic
                    accessibilityRole="button"
                    accessibilityLabel={`${MONTH_NAMES[cursor.m]} ${day}, ${cursor.y}${isToday ? ", today" : ""}`}
                    accessibilityState={{ selected: isSelected, disabled }}
                  >
                    <View style={styles.dayHit}>
                      <View
                        style={[
                          styles.day,
                          isSelected && styles.daySelected,
                          !isSelected && isToday && styles.dayToday,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayLabel,
                            isSelected && styles.dayLabelSelected,
                            disabled && styles.dayLabelDisabled,
                          ]}
                        >
                          {day}
                        </Text>
                      </View>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          </FadeInView>
        ) : view === "months" ? (
          <FadeInView key={`m-${cursor.y}`} duration={160}>
            <View style={styles.pillGrid}>
              {MONTH_SHORT.map((label, m) => {
                const disabled = !monthInRange(cursor.y, m);
                const isSelected = selected != null && selected.y === cursor.y && selected.m === m;
                return (
                  <PressableScale
                    key={label}
                    style={styles.pillCell}
                    disabled={disabled}
                    onPress={() => {
                      setCursor({ y: cursor.y, m });
                      setView("days");
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${MONTH_NAMES[m]} ${cursor.y}`}
                    accessibilityState={{ selected: isSelected, disabled }}
                  >
                    <View style={[styles.pill, isSelected && styles.pillSelected]}>
                      <Text
                        style={[styles.pillLabel, isSelected && styles.pillLabelSelected, disabled && styles.dayLabelDisabled]}
                      >
                        {label}
                      </Text>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          </FadeInView>
        ) : (
          <FadeInView key={`y-${pageStart}`} duration={160}>
            <View style={styles.pillGrid}>
              {years.map((y) => {
                const disabled = !yearInRange(y);
                const isSelected = selected != null && selected.y === y;
                return (
                  <PressableScale
                    key={y}
                    style={styles.pillCell}
                    disabled={disabled}
                    onPress={() => {
                      setCursor((c) => ({ y, m: clampMonth(y, c.m) }));
                      setView("months");
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${y}`}
                    accessibilityState={{ selected: isSelected, disabled }}
                  >
                    <View style={[styles.pill, isSelected && styles.pillSelected]}>
                      <Text
                        style={[styles.pillLabel, isSelected && styles.pillLabelSelected, disabled && styles.dayLabelDisabled]}
                      >
                        {y}
                      </Text>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          </FadeInView>
        )}
      </View>

      {/* Skip the row entirely when it would be empty — an empty View still
          contributes its marginTop, leaving a phantom gap under the calendar. */}
      {showChips || allowClear ? (
        <View style={styles.chipRow}>
          {showChips
            ? chips.map((c) => (
                <SelectableChip key={c.label} label={c.label} selected={value === c.ts} onPress={() => onChange(c.ts)} />
              ))
            : null}
          {allowClear ? <SelectableChip label="None" selected={value == null} onPress={() => onChange(null)} /> : null}
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    card: {
      borderRadius: radius.md,
      backgroundColor: colors.card,
      paddingHorizontal: 10,
      paddingTop: 12,
      paddingBottom: 10,
      overflow: "hidden",
      ...cardShadow,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 4,
    },
    navButton: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      backgroundColor: colors.fill,
      alignItems: "center",
      justifyContent: "center",
    },
    navDisabled: { opacity: 0.3 },
    headerTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      // Keep the title's own tap target at 44pt without inflating the row.
      height: 44,
    },
    headerTitle: { fontSize: 15, fontFamily: font.bold, color: colors.label },

    grid: { marginTop: 6, flexDirection: "row", flexWrap: "wrap" },
    weekdayCell: { width: CELL_PCT, alignItems: "center", justifyContent: "center", height: 24 },
    weekday: { fontSize: 11, fontFamily: font.semibold, color: colors.label3 },
    // 44pt cell = the tap target; the 36pt disc inside is the paint, which keeps
    // the website's proportions without shrinking the target. `dayHit` is what
    // gives the target its size: PressableScale puts its `style` on the OUTER
    // Animated.View, so centring there would let the inner Pressable shrink to
    // the disc. The cell only sizes; the child stretches and does the centring.
    cell: { width: CELL_PCT, height: 44 },
    dayHit: { width: "100%", height: 44, alignItems: "center", justifyContent: "center" },
    day: { width: 36, height: 36, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
    daySelected: { backgroundColor: colors.accent },
    dayToday: { borderWidth: 2, borderColor: colors.accent },
    dayLabel: { fontSize: 14, fontFamily: font.semibold, color: colors.label },
    dayLabelSelected: { color: colors.white },
    dayLabelDisabled: { color: withAlpha(colors.label3, 0.4) },

    // Shared by the month and year drill-out grids — same 3×4 shape.
    pillGrid: { marginTop: 10, flexDirection: "row", flexWrap: "wrap" },
    pillCell: { width: "33.333%", paddingVertical: 4, paddingHorizontal: 4 },
    pill: {
      height: 44,
      borderRadius: radius.sm,
      backgroundColor: colors.fill,
      alignItems: "center",
      justifyContent: "center",
    },
    pillSelected: { backgroundColor: colors.accent },
    pillLabel: { fontSize: 14, fontFamily: font.semibold, color: colors.label },
    pillLabelSelected: { color: colors.white },

    chipRow: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  });
