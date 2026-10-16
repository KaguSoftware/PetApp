import DateTimePicker from "@expo/ui/community/datetime-picker";
import { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { clockTime, formatDate, toDateString } from "@/lib/format";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";
import { useTheme } from "./theme";
import { layout, radius } from "./tokens";

type Mode = "date" | "time";

interface PickerProps {
  value: Date;
  mode: Mode;
  onChange: (d: Date) => void;
  maximumDate?: Date;
  label: string;
}

/**
 * The platform's own date / time control. iOS: the compact system pill (tap for the popover).
 * Android: a tappable value that opens the Material dialog.
 */
function Picker({ value, mode, onChange, maximumDate, label }: PickerProps) {
  const { colors, scheme } = useTheme();
  const [open, setOpen] = useState(false);
  if (Platform.OS === "android") {
    return (
      <>
        <PressableScale
          onPress={() => setOpen(true)}
          haptic="select"
          accessibilityRole="button"
          accessibilityLabel={label}
          style={[styles.value, { backgroundColor: colors.surface }]}
        >
          <Text variant="callout">{mode === "date" ? formatDate(toDateString(value.getTime())) : clockTime(value.getTime())}</Text>
        </PressableScale>
        {open ? (
          <DateTimePicker
            value={value}
            mode={mode}
            maximumDate={maximumDate}
            presentation="dialog"
            onChange={(e, d) => {
              setOpen(false);
              if (e.type === "set" && d) onChange(d);
            }}
          />
        ) : null}
      </>
    );
  }
  return (
    <DateTimePicker
      value={value}
      mode={mode}
      display="compact"
      maximumDate={maximumDate}
      accentColor={colors.ink}
      themeVariant={scheme}
      onValueChange={(_, d) => onChange(d)}
      style={mode === "date" ? styles.iosDate : styles.iosTime}
    />
  );
}

function parse(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12) : new Date();
}

/** A form row: label on the left, the native control on the right. */
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: colors.surface }]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.control}>{children}</View>
    </View>
  );
}

/**
 * yyyy-mm-dd field (birthdays, vaccine dates). `optional` fields start empty ("None") and can be
 * cleared again.
 */
export function DateField({
  label,
  value,
  onChange,
  optional = false,
  maximumDate,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
  maximumDate?: Date;
}) {
  const { colors } = useTheme();
  const empty = value.trim() === "";
  return (
    <FieldRow label={label}>
      {optional && empty ? (
        <PressableScale
          onPress={() => onChange(toDateString(Date.now()))}
          haptic="select"
          accessibilityRole="button"
          accessibilityLabel={`Set ${label}`}
          style={[styles.value, { backgroundColor: colors.bg }]}
        >
          <Text variant="callout" tone="ink2">
            Set date
          </Text>
        </PressableScale>
      ) : (
        <View style={styles.controlInner}>
          <Picker label={label} mode="date" value={parse(value)} maximumDate={maximumDate} onChange={(d) => onChange(toDateString(d.getTime()))} />
          {optional ? (
            <PressableScale
              onPress={() => onChange("")}
              haptic="select"
              accessibilityRole="button"
              accessibilityLabel={`Clear ${label}`}
              style={styles.clear}
            >
              <Text variant="callout" tone="ink2">
                Clear
              </Text>
            </PressableScale>
          ) : null}
        </View>
      )}
    </FieldRow>
  );
}

/** Date and time of an event (ms). Never later than `maximumDate`. */
export function DateTimeField({
  label = "When",
  value,
  onChange,
  maximumDate,
}: {
  label?: string;
  value: number;
  onChange: (ts: number) => void;
  maximumDate?: Date;
}) {
  const date = new Date(value);
  const cap = (d: Date) => (maximumDate && d.getTime() > maximumDate.getTime() ? maximumDate.getTime() : d.getTime());
  return (
    <>
      <FieldRow label={`${label} (date)`}>
        <Picker label={`${label} date`} mode="date" value={date} maximumDate={maximumDate} onChange={(d) => onChange(cap(d))} />
      </FieldRow>
      <FieldRow label={`${label} (time)`}>
        <Picker label={`${label} time`} mode="time" value={date} onChange={(d) => onChange(cap(d))} />
      </FieldRow>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.item,
    minHeight: layout.rowMinHeight,
    paddingLeft: layout.gutter - 4,
    paddingRight: layout.item,
    borderRadius: radius.md,
  },
  label: { flex: 1 },
  control: { alignItems: "flex-end", justifyContent: "center" },
  controlInner: { flexDirection: "row", alignItems: "center", gap: layout.item },
  value: { minHeight: 36, paddingHorizontal: 14, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  clear: { minHeight: 44, justifyContent: "center" },
  iosDate: { width: 150, height: 36 },
  iosTime: { width: 110, height: 36 },
});
