import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import EmptyState from "@/components/EmptyState";
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
import { Pet } from "@/lib/data";
import { timeAgo, useStore } from "@/lib/store";
import { colors, font } from "@/lib/theme";

export default function Meds({ pet }: { pet: Pet }) {
  const { state, addMed, deleteMed, toast } = useStore();
  // Light adherence signal — the most recent "meds" activity for this pet.
  const lastGiven = state.activities.find((a) => a.petId === pet.id && a.type === "meds")?.ts;
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");

  const reset = () => {
    setName("");
    setDosage("");
    setFrequency("");
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
          {pet.meds.map((m) => (
            <Row
              key={m.id}
              leading={<IconCircle icon="pill" tint={colors.red} bg={colors.redSoft} />}
              title={m.name}
              subtitle={[m.dosage, m.frequency].filter(Boolean).join(" · ") || undefined}
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
          ))}
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
        <TextField
          value={frequency}
          onChangeText={setFrequency}
          placeholder="e.g. Monthly (optional)"
          returnKeyType="done"
          onSubmitEditing={save}
        />

        <SheetFooter>
          <AccentButton disabled={!valid} onPress={save}>
            Add med
          </AccentButton>
        </SheetFooter>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  addLink: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 24 },
  addLinkLabel: { fontSize: 13, fontFamily: font.semibold, color: colors.accent },
  deleteButton: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  lastGiven: { paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4, fontSize: 12, fontFamily: font.regular, color: colors.label3 },
});
