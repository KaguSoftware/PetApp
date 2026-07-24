import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import EmptyState from "@/components/EmptyState";
import ScheduleEditorSheet from "@/components/ScheduleEditorSheet";
import Sheet from "@/components/Sheet";
import { Icon } from "@/components/Icons";
import {
  AccentButton,
  FieldLabel,
  Group,
  IconCircle,
  PRESS_SCALE_SMALL,
  PressableScale,
  Row,
  SectionHeader,
  SheetFooter,
  SheetSubtitle,
  SheetTitle,
  TextField,
} from "@/components/ui";
import { DEFAULT_MED_FREQUENCY, MED_FREQUENCIES, SingleWheelPicker } from "@/components/WheelPicker";
import { describeSchedule, findSchedule } from "@/lib/careStatus";
import { Pet } from "@/lib/data";
import { timeAgo, useStore } from "@/lib/store";
import { colors, font } from "@/lib/theme";

export default function Meds({ pet }: { pet: Pet }) {
  const { state, addMed, deleteMed, toast } = useStore();
  // Light adherence signal — the most recent "meds" activity for this pet.
  const lastGiven = state.activities.find((a) => a.petId === pet.id && a.type === "meds")?.ts;
  const [addOpen, setAddOpen] = useState(false);
  const [scheduleMedId, setScheduleMedId] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  // The wheel always shows a row, so seed the state to match what's displayed
  // rather than "" (which would save an empty frequency for an untouched wheel).
  const [frequency, setFrequency] = useState(DEFAULT_MED_FREQUENCY);

  const reset = () => {
    setName("");
    setDosage("");
    setFrequency(DEFAULT_MED_FREQUENCY);
  };

  const valid = name.trim() !== "";
  const save = () => {
    if (!valid) return;
    addMed(pet.id, name.trim(), dosage.trim() || undefined, frequency.trim() || undefined);
    setAddOpen(false);
    reset();
    toast("pill", `${name.trim()} added`, `${pet.name}'s meds list`);
  };

  return (
    <>
      <SectionHeader
        trailing={
          <PressableScale
            scaleTo={PRESS_SCALE_SMALL}
            onPress={() => setAddOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Add med"
            hitSlop={10}
          >
            <View style={styles.addLink}>
              <Icon name="plus" size={14} color={colors.accent} />
              <Text style={styles.addLinkLabel}>Add med</Text>
            </View>
          </PressableScale>
        }
      >
        Meds
      </SectionHeader>

      {pet.meds.length > 0 ? (
        <Group>
          {pet.meds.map((m) => {
            const schedule = findSchedule(state.schedules, pet.id, "meds", m.id);
            return (
              <Row
                key={m.id}
                onPress={() => {
                  setScheduleMedId(m.id);
                  setScheduleOpen(true);
                }}
                interactiveTrailing
                leading={<IconCircle icon="pill" tint={colors.red} bg={colors.redSoft} />}
                title={m.name}
                subtitle={
                  [m.dosage, schedule ? describeSchedule(schedule) : m.frequency].filter(Boolean).join(" · ") ||
                  "Tap to set a dose schedule"
                }
                trailing={
                  <PressableScale
                    scaleTo={PRESS_SCALE_SMALL}
                    onPress={() => deleteMed(pet.id, m.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${m.name}`}
                    hitSlop={10}
                  >
                    <View style={styles.deleteButton}>
                      <Icon name="xmark" size={15} color={colors.label3} />
                    </View>
                  </PressableScale>
                }
              />
            );
          })}
          {lastGiven != null ? (
            <Text style={styles.lastGiven}>Last given {timeAgo(lastGiven)} — log doses from the Logs tab</Text>
          ) : null}
        </Group>
      ) : (
        <EmptyState icon="pill" title="No meds yet" body={`Add ${pet.name}'s medications to keep track.`} />
      )}

      <Sheet
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          reset();
        }}
      >
        <SheetTitle>New med</SheetTitle>
        <SheetSubtitle>For {pet.name}</SheetSubtitle>

        <FieldLabel>Name</FieldLabel>
        <TextField value={name} onChangeText={setName} placeholder="e.g. Flea treatment" returnKeyType="done" onSubmitEditing={save} />

        <FieldLabel>Dosage</FieldLabel>
        <TextField
          value={dosage}
          onChangeText={setDosage}
          placeholder="e.g. 1 pipette (optional)"
          returnKeyType="done"
          onSubmitEditing={save}
        />

        <FieldLabel>Frequency</FieldLabel>
        <SingleWheelPicker values={MED_FREQUENCIES} value={frequency} onChange={setFrequency} />

        <SheetFooter>
          <AccentButton disabled={!valid} onPress={save}>
            Add med
          </AccentButton>
        </SheetFooter>
      </Sheet>

      {scheduleMedId != null ? (
        <ScheduleEditorSheet
          pet={pet}
          type="meds"
          medId={scheduleMedId}
          open={scheduleOpen}
          onClose={() => setScheduleOpen(false)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  addLink: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 24 },
  addLinkLabel: { fontSize: 13, fontFamily: font.semibold, color: colors.accent },
  deleteButton: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  lastGiven: { paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4, fontSize: 12, fontFamily: font.regular, color: colors.label3 },
});
