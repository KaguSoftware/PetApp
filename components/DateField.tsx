import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icons";
import { PressableScale, PRESS_SCALE_SMALL, SelectableChip } from "@/components/ui";
import { cardShadow, colors, font, radius } from "@/lib/theme";

/**
 * The one date input used across sheets (birth date, vaccination dates, vet
 * visits, breeding). It shows the native iOS wheel spinner inline (the "default"
 * iOS date selector the design asks for) with quick-jump chips beneath, and
 * falls back to Android's dialog picker via a tappable value row.
 *
 * `value` is a noon timestamp (or null); `onChange` gets the same. Every site
 * imports this — there is no per-screen copy any more, so the wheel stays
 * identical everywhere.
 */

const DATE_FMT: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, DATE_FMT);
}

/** Normalise to local noon so DST / timezone shifts can't bump the calendar day. */
function atNoon(d: Date) {
  const c = new Date(d);
  c.setHours(12, 0, 0, 0);
  return c.getTime();
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

export type DateFieldMode = "past" | "future";

export default function DateField({
  value,
  onChange,
  mode = "past",
  allowClear = false,
}: {
  value: number | null;
  onChange: (ts: number | null) => void;
  mode?: DateFieldMode;
  allowClear?: boolean;
}) {
  const today = atNoon(new Date());
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

  // Constrain the wheel so a "past" field can't roll into the future and a
  // "future" field can't roll into the past.
  const minimumDate = mode === "future" ? new Date(today) : undefined;
  const maximumDate = mode === "past" ? new Date(today) : undefined;

  // Android has no inline spinner — it opens a modal dialog on demand.
  const [androidOpen, setAndroidOpen] = useState(false);

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setAndroidOpen(false);
      // `dismissed` fires when the user cancels the dialog — keep the old value.
      if (event.type === "dismissed" || !date) return;
    }
    if (!date) return;
    onChange(atNoon(date));
  };

  return (
    <View>
      {Platform.OS === "ios" ? (
        <View style={styles.wheelCard}>
          <DateTimePicker
            value={new Date(value ?? today)}
            mode="date"
            display="spinner"
            onChange={handleChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            themeVariant="light"
            style={styles.wheel}
          />
        </View>
      ) : (
        <>
          <PressableScale
            scaleTo={PRESS_SCALE_SMALL}
            onPress={() => setAndroidOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Pick a date"
          >
            <View style={styles.androidValueRow}>
              <Text style={[styles.androidValue, value == null && { color: colors.label3 }]}>
                {value != null ? fmtDate(value) : "Pick a date"}
              </Text>
              <Icon name="chevron-right" size={16} color={colors.accent} />
            </View>
          </PressableScale>
          {androidOpen ? (
            <DateTimePicker
              value={new Date(value ?? today)}
              mode="date"
              display="calendar"
              onChange={handleChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
            />
          ) : null}
        </>
      )}
      <View style={styles.chipRow}>
        {chips.map((c) => (
          <SelectableChip key={c.label} label={c.label} selected={value === c.ts} onPress={() => onChange(c.ts)} />
        ))}
        {allowClear ? <SelectableChip label="None" selected={value == null} onPress={() => onChange(null)} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wheelCard: {
    borderRadius: radius.md,
    backgroundColor: colors.card,
    overflow: "hidden",
    ...cardShadow,
  },
  // The iOS spinner needs a fixed height or it collapses inside a scroll view.
  wheel: { height: 180, alignSelf: "stretch" },
  androidValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...cardShadow,
  },
  androidValue: { fontSize: 16, fontFamily: font.medium, color: colors.label },
  chipRow: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
