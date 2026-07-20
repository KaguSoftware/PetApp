import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Sheet from "@/components/Sheet";
import { Icon } from "@/components/Icons";
import {
  AccentButton,
  FieldLabel,
  Group,
  IconCircle,
  Row,
  SheetFooter,
  SheetSubtitle,
  SheetTitle,
  TextField,
} from "@/components/ui";
import { DEFAULT_MED_FREQUENCY, MED_FREQUENCIES, SingleWheelPicker } from "@/components/WheelPicker";
import { careItemStatus } from "@/lib/careStatus";
import type { Pet } from "@/lib/data";
import { timeAgo, useStore } from "@/lib/store";
import { colors, font } from "@/lib/theme";

/**
 * "Which med?" — pick one of the pet's medications (to log a dose or backfill
 * one), or add a new medication inline without leaving the flow.
 */
export default function MedPickerSheet({
  pet,
  open,
  onClose,
  onSelect,
  title = "Which med?",
  initialAdding = false,
}: {
  pet: Pet;
  open: boolean;
  onClose: () => void;
  /** Called with the chosen medication's id. Closing is the caller's job. */
  onSelect: (medId: string) => void;
  title?: string;
  /** Open straight onto the "new medication" form (the Add medication row). */
  initialAdding?: boolean;
}) {
  const { state, addMed, toast } = useStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState(DEFAULT_MED_FREQUENCY);

  useEffect(() => {
    if (!open) return;
    // A pet with no meds yet goes straight to the add form.
    setAdding(initialAdding || pet.meds.length === 0);
    setName("");
    setDosage("");
    setFrequency(DEFAULT_MED_FREQUENCY);
  }, [open, pet.meds.length, initialAdding]);

  const valid = name.trim() !== "";
  const saveNew = () => {
    if (!valid) return;
    addMed(pet.id, name.trim(), dosage.trim() || undefined, frequency.trim() || undefined);
    toast("pill", `${name.trim()} added`, `${pet.name}'s meds list — set its schedule from the Logs page`);
    setAdding(false);
    setName("");
    setDosage("");
    setFrequency(DEFAULT_MED_FREQUENCY);
  };

  return (
    <Sheet open={open} onClose={onClose}>
      {adding ? (
        <>
          <SheetTitle>New medication</SheetTitle>
          <SheetSubtitle>For {pet.name}</SheetSubtitle>

          <FieldLabel>Name</FieldLabel>
          <TextField value={name} onChangeText={setName} placeholder="e.g. Apoquel" returnKeyType="done" onSubmitEditing={saveNew} />

          <FieldLabel>Dosage</FieldLabel>
          <TextField value={dosage} onChangeText={setDosage} placeholder="e.g. 16 mg (optional)" returnKeyType="done" onSubmitEditing={saveNew} />

          <FieldLabel>Frequency</FieldLabel>
          <SingleWheelPicker values={MED_FREQUENCIES} value={frequency} onChange={setFrequency} />

          <SheetFooter>
            <View style={{ gap: 10 }}>
              <AccentButton disabled={!valid} onPress={saveNew}>
                Add medication
              </AccentButton>
              {pet.meds.length > 0 ? (
                <AccentButton variant="gray" onPress={() => setAdding(false)}>
                  Back
                </AccentButton>
              ) : null}
            </View>
          </SheetFooter>
        </>
      ) : (
        <>
          <SheetTitle>{title}</SheetTitle>
          <SheetSubtitle>For {pet.name}</SheetSubtitle>
          <View style={{ marginTop: 12 }}>
            <Group>
              {pet.meds.map((m) => {
                const status = careItemStatus(pet, "meds", m.id, state.schedules, state.activities, Date.now());
                const given = status.last ? `Given ${timeAgo(status.last.ts)}` : "Not given yet";
                return (
                  <Row
                    key={m.id}
                    onPress={() => onSelect(m.id)}
                    leading={<IconCircle icon="pill" tint={colors.red} bg={colors.redSoft} />}
                    title={m.name}
                    subtitle={[m.dosage, given].filter(Boolean).join(" · ")}
                    trailing={
                      status.state === "done" ? <Icon name="check" size={18} color={colors.green} /> : undefined
                    }
                  />
                );
              })}
              <Row
                onPress={() => setAdding(true)}
                leading={<IconCircle icon="plus" tint={colors.accent} bg={colors.accentSoft} />}
                title={<Text style={styles.addTitle}>Add new medication</Text>}
              />
            </Group>
          </View>
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  addTitle: { fontSize: 16, fontFamily: font.semibold, color: colors.accent },
});
