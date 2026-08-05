import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import DateField from "@/components/DateField";
import Sheet from "@/components/Sheet";
import { Stepper } from "@/components/TimeStepper";
import { TimeWheelPicker } from "@/components/WheelPicker";
import {
  AccentButton,
  FieldLabel,
  SelectableChip,
  SheetFooter,
  SheetSubtitle,
  SheetTitle,
  TextField,
} from "@/components/ui";
import { REMINDER_TAGS, type Pet, type RepeatKind } from "@/lib/data";
import { repeatLabel } from "@/lib/inbox";
import { useStore } from "@/lib/store";

const DAY_MS = 86_400_000;

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

/**
 * Writing a reminder. Lifted wholesale out of the old `/reminders` screen —
 * the form itself was never the problem with that page, and every control in
 * it (the shared calendar `DateField`, the clock-style `TimeWheelPicker`, the
 * repeat stepper) is the app's standard one. It lives here so the Inbox page
 * stays a page rather than a page plus a form.
 */
export default function AddReminderSheet({ open, onClose, pets }: { open: boolean; onClose: () => void; pets: Pet[] }) {
  const styles = useMemo(() => makeStyles(), []);
  const { addReminder, toast } = useStore();

  const [title, setTitle] = useState("");
  const [petId, setPetId] = useState("");
  const [days, setDays] = useState(1);
  const [pickDate, setPickDate] = useState(false);
  // The exact-date branch: the shared calendar for the day, plus the time wheel
  // below it. `pickTs` is a noon timestamp; the time is applied on save.
  const [pickTs, setPickTs] = useState<number | null>(null);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [repeat, setRepeat] = useState<"none" | RepeatKind>("none");
  const [intervalDays, setIntervalDays] = useState(3);
  const [tag, setTag] = useState<string | undefined>(undefined);
  const [customTagOpen, setCustomTagOpen] = useState(false);
  const [customTag, setCustomTag] = useState("");

  // Validated against the live roster: pets are realtime-synced, so a selection
  // can be deleted out from under this sheet mid-session — and with a single pet
  // the chip row isn't even rendered to correct it by hand.
  const activePetId = (petId && pets.some((p) => p.id === petId) ? petId : pets[0]?.id) || "";

  const close = () => {
    onClose();
    setTitle("");
    setPickDate(false);
    setPickTs(null);
    setHour(9);
    setMinute(0);
    setRepeat("none");
    setTag(undefined);
    setCustomTagOpen(false);
    setCustomTag("");
  };

  return (
    <Sheet open={open} onClose={close}>
      <SheetTitle>New reminder</SheetTitle>
      <SheetSubtitle>Visible to the whole family</SheetSubtitle>

      <FieldLabel>Task</FieldLabel>
      <TextField value={title} onChangeText={setTitle} placeholder="e.g. Buy litter, flea treatment…" />

      {/* One pet = one pre-selected chip that can't be deselected — skip the
          whole row; activePetId already falls back to the only pet. */}
      {pets.length > 1 ? (
        <>
          <FieldLabel>Pet</FieldLabel>
          <View style={styles.chipRow}>
            {pets.map((p) => (
              <SelectableChip key={p.id} label={p.name} selected={activePetId === p.id} onPress={() => setPetId(p.id)} />
            ))}
          </View>
        </>
      ) : null}

      <FieldLabel>Tag</FieldLabel>
      <View style={styles.chipRow}>
        {REMINDER_TAGS.map((t) => (
          <SelectableChip
            key={t}
            label={t}
            selected={tag === t}
            onPress={() => {
              setTag(tag === t ? undefined : t);
              setCustomTagOpen(false);
            }}
          />
        ))}
        <SelectableChip
          label="+"
          selected={customTagOpen}
          onPress={() => {
            setCustomTagOpen((v) => !v);
            setTag(undefined);
          }}
        />
      </View>
      {customTagOpen ? (
        <View style={styles.pickerRow}>
          <View style={{ flex: 1 }}>
            <TextField
              value={customTag}
              onChangeText={(t) => {
                setCustomTag(t);
                setTag(t.trim() || undefined);
              }}
              placeholder="Custom tag"
              returnKeyType="done"
            />
          </View>
        </View>
      ) : null}

      <FieldLabel>Due</FieldLabel>
      <View style={styles.chipRow}>
        {[
          { d: 0, label: "Today" },
          { d: 1, label: "Tomorrow" },
          { d: 3, label: "In 3 days" },
          { d: 7, label: "Next week" },
        ].map((o) => (
          <SelectableChip
            key={o.d}
            label={o.label}
            selected={!pickDate && days === o.d}
            onPress={() => {
              setDays(o.d);
              setPickDate(false);
            }}
          />
        ))}
        <SelectableChip
          label="Pick date…"
          selected={pickDate}
          onPress={() => {
            setPickDate(true);
            if (pickTs == null) {
              const noon = new Date();
              noon.setHours(12, 0, 0, 0);
              setPickTs(noon.getTime());
            }
          }}
        />
      </View>
      {pickDate ? (
        <>
          {/* showChips off: the calendar's quick-jump chips would duplicate the
              Due presets right above it. */}
          <View style={styles.pickerRow}>
            <DateField value={pickTs} onChange={setPickTs} mode="future" showChips={false} />
          </View>
          <View style={styles.pickerBlock}>
            <TimeWheelPicker
              value={`${pad(hour)}:${pad(minute)}`}
              onChange={(t) => {
                const [h, m] = t.split(":");
                setHour(Number(h));
                setMinute(Number(m));
              }}
            />
          </View>
        </>
      ) : null}

      <FieldLabel>Repeat</FieldLabel>
      <View style={styles.chipRow}>
        {(
          [
            { value: "none", label: "Once" },
            { value: "daily", label: "Daily" },
            { value: "weekly", label: "Weekly" },
            { value: "every_n_days", label: "Every… days" },
          ] as { value: "none" | RepeatKind; label: string }[]
        ).map((o) => (
          <SelectableChip key={o.value} label={o.label} selected={repeat === o.value} onPress={() => setRepeat(o.value)} />
        ))}
      </View>
      {repeat === "every_n_days" ? (
        <View style={styles.pickerRow}>
          <Stepper
            label={`Every ${intervalDays} days`}
            onDec={() => setIntervalDays((n) => Math.max(1, n - 1))}
            onInc={() => setIntervalDays((n) => n + 1)}
            decDisabled={intervalDays <= 1}
            accessibilityLabel="Days between repeats"
          />
        </View>
      ) : null}

      <SheetFooter>
        <AccentButton
          disabled={!title.trim() || !activePetId || (pickDate && pickTs == null) || (repeat === "every_n_days" && intervalDays < 1)}
          onPress={() => {
            let due: number;
            if (pickDate && pickTs != null) {
              const d = new Date(pickTs);
              d.setHours(hour, minute, 0, 0);
              due = d.getTime();
            } else {
              due = Date.now() + days * DAY_MS;
            }
            addReminder({
              petId: activePetId,
              title: title.trim(),
              emoji: "📝",
              due,
              repeatKind: repeat === "none" ? undefined : repeat,
              repeatInterval: repeat === "every_n_days" ? Math.round(intervalDays) : undefined,
              tag,
            });
            close();
            toast(
              repeat === "none" ? "clock" : "repeat",
              "Reminder added",
              repeat === "none" ? "Visible to the whole family" : `Repeats ${repeatLabel(repeat, intervalDays)}`
            );
          }}
        >
          Add reminder
        </AccentButton>
      </SheetFooter>
    </Sheet>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    chipRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
    pickerRow: { marginTop: 12, flexDirection: "row", gap: 8 },
    pickerBlock: { marginTop: 12 },
  });
