import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Sheet from "@/components/Sheet";
import { AccentButton, SelectableChip, SheetSubtitle, SheetTitle } from "@/components/ui";
import type { Pet } from "@/lib/data";

/** The closed set of session lengths. Covers a quick garden break through a
 *  long hike; anything in between rounds to the nearest chip — precision past
 *  this adds friction without adding meaning for a care log. */
const DURATIONS = [10, 15, 20, 30, 45, 60, 90] as const;

/**
 * Duration picker for logging exercise & play (the "walk" action) — the
 * measured-log counterpart of FeedPortionSheet's portion picker. Calls back
 * with the chosen minutes; the caller owns the actual logAction so it can
 * thread pet/timestamp context.
 */
export default function DurationPickerSheet({
  pet,
  open,
  onClose,
  onPick,
}: {
  pet: Pet;
  open: boolean;
  onClose: () => void;
  /** Called with the chosen duration in minutes. */
  onPick: (minutes: number) => void;
}) {
  const [minutes, setMinutes] = useState<number>(30);

  const confirm = () => {
    onClose();
    onPick(minutes);
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetTitle>How long was it?</SheetTitle>
      <SheetSubtitle>Exercise &amp; play with {pet.name}</SheetSubtitle>
      <View style={styles.chips}>
        {DURATIONS.map((m) => (
          <SelectableChip key={m} label={m === 90 ? "1½ hr" : m === 60 ? "1 hr" : `${m} min`} selected={minutes === m} onPress={() => setMinutes(m)} />
        ))}
      </View>
      <View style={{ marginTop: 28 }}>
        <AccentButton onPress={confirm}>Log {minutes >= 60 ? (minutes === 60 ? "1 hour" : "1½ hours") : `${minutes} minutes`}</AccentButton>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 20 },
});

/** Renders a logged duration back out ("25 min", "1 hr", "1 hr 30 min"). */
export function formatDuration(minutes: number): string {
  if (minutes % 60 === 0 && minutes >= 60) return `${minutes / 60} hr`;
  if (minutes > 60) return `${Math.floor(minutes / 60)} hr ${minutes % 60} min`;
  return `${minutes} min`;
}
