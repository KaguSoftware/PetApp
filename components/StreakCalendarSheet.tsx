import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Sheet from "@/components/Sheet";
import { Icon } from "@/components/Icons";
import { PRESS_SCALE_SMALL, PressableScale, SheetSubtitle, SheetTitle } from "@/components/ui";
import { useStore } from "@/lib/store";
import { colors, font, radius, withAlpha } from "@/lib/theme";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CELL_PCT = `${100 / 7}%` as const;

export default function StreakCalendarSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useStore();
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const activeDays = useMemo(() => {
    const set = new Set<string>();
    for (const a of state.activities) {
      const d = new Date(a.ts);
      set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
    return set;
  }, [state.activities]);

  const today = new Date();
  const isCurrentMonth = calendarMonth.y === today.getFullYear() && calendarMonth.m === today.getMonth();
  const calendarCells = useMemo(() => {
    const { y, m } = calendarMonth;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const firstWeekday = new Date(y, m, 1).getDay();
    const cells: ({ day: number; active: boolean; isToday: boolean; isFuture: boolean } | null)[] = Array(firstWeekday).fill(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(y, m, day);
      cells.push({
        day,
        active: activeDays.has(`${y}-${m}-${day}`),
        isToday: date.toDateString() === today.toDateString(),
        isFuture: date > today,
      });
    }
    return cells;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarMonth, activeDays]);

  return (
    <Sheet open={open} onClose={onClose}>
      <View style={styles.titleRow}>
        <Icon name="flame" size={19} color={colors.orange} />
        <SheetTitle>{state.streak}-day streak</SheetTitle>
      </View>
      <SheetSubtitle>Days with logged care show up lit — keep it going</SheetSubtitle>

      <View style={styles.monthRow}>
        <PressableScale
          scaleTo={PRESS_SCALE_SMALL}
          onPress={() => setCalendarMonth((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          hitSlop={8}
        >
          <View style={styles.monthButton}>
            <Icon name="chevron-left" size={14} color={colors.label} />
          </View>
        </PressableScale>
        <Text style={styles.monthLabel}>
          {MONTH_NAMES[calendarMonth.m]} {calendarMonth.y}
        </Text>
        <PressableScale
          scaleTo={PRESS_SCALE_SMALL}
          onPress={() => setCalendarMonth((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          hitSlop={8}
          disabled={isCurrentMonth}
        >
          <View style={[styles.monthButton, isCurrentMonth && { opacity: 0.3 }]}>
            <Icon name="chevron-right" size={14} color={colors.label} />
          </View>
        </PressableScale>
      </View>

      <View style={styles.grid}>
        {WEEKDAY_LABELS.map((d, i) => (
          <View key={`w${i}`} style={styles.cell}>
            <Text style={styles.weekday}>{d}</Text>
          </View>
        ))}
        {calendarCells.map((cell, i) =>
          cell ? (
            <View key={i} style={styles.cell}>
              <View
                accessibilityLabel={`${MONTH_NAMES[calendarMonth.m]} ${cell.day}${cell.isToday ? ", today" : ""} — ${
                  cell.active ? "care logged" : cell.isFuture ? "upcoming" : "no care logged"
                }`}
                style={[styles.day, cell.active && styles.dayActive, !cell.active && cell.isToday && styles.dayToday]}
              >
                {cell.active ? (
                  <Icon name="flame" size={14} color={colors.white} />
                ) : (
                  <Text
                    style={[
                      styles.dayLabel,
                      cell.isToday ? { color: colors.label } : cell.isFuture ? { color: withAlpha(colors.label3, 0.5) } : null,
                    ]}
                  >
                    {cell.day}
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <View key={i} style={styles.cell} />
          )
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  monthRow: { marginTop: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
  monthLabel: { fontSize: 15, fontFamily: font.bold, color: colors.label },
  grid: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", rowGap: 8 },
  cell: { width: CELL_PCT, alignItems: "center", justifyContent: "center" },
  weekday: { fontSize: 11, fontFamily: font.semibold, color: colors.label3 },
  day: { width: 32, height: 32, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  dayActive: { backgroundColor: colors.orange },
  dayToday: { borderWidth: 2, borderColor: colors.accent },
  dayLabel: { fontSize: 13, fontFamily: font.semibold, color: colors.label2 },
});
