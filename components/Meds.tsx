import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Sheet from "@/components/Sheet";
import { Icon } from "@/components/Icons";
import { AccentButton, Group, IconCircle, Row, SectionHeader } from "@/components/ui";
import { Pet } from "@/lib/data";
import { timeAgo, useStore } from "@/lib/store";
import { cardShadow, colors, font } from "@/lib/theme";

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

  return (
    <>
      <SectionHeader
        trailing={
          <Pressable
            onPress={() => setAddOpen(true)}
            accessibilityLabel="Add med"
            hitSlop={10}
            style={({ pressed }) => [styles.addLink, pressed && { opacity: 0.6 }]}
          >
            <Icon name="plus" size={14} color={colors.accent} />
            <Text style={styles.addLinkLabel}>Add med</Text>
          </Pressable>
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
                <Pressable
                  onPress={() => deleteMed(pet.id, m.id)}
                  accessibilityLabel={`Delete ${m.name}`}
                  hitSlop={10}
                  style={({ pressed }) => [styles.deleteButton, pressed && { backgroundColor: colors.fill }]}
                >
                  <Icon name="xmark" size={15} color={colors.label3} />
                </Pressable>
              }
            />
          ))}
          {lastGiven != null ? (
            <Text style={styles.lastGiven}>Last given {timeAgo(lastGiven)} — log doses from the Logs tab</Text>
          ) : null}
        </Group>
      ) : (
        <Group>
          <View style={styles.empty}>
            <IconCircle icon="pill" tint={colors.label2} bg={colors.fill} size={48} iconSize={22} />
            <Text style={styles.emptyTitle}>No meds yet</Text>
            <Text style={styles.emptyBody}>Add {pet.name}&apos;s medications to keep track.</Text>
          </View>
        </Group>
      )}

      <Sheet
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          reset();
        }}
      >
        <Text style={styles.sheetTitle}>New med</Text>
        <Text style={styles.sheetSubtitle}>For {pet.name}</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Flea treatment"
          placeholderTextColor={colors.label3}
          style={styles.input}
        />

        <Text style={styles.label}>Dosage</Text>
        <TextInput
          value={dosage}
          onChangeText={setDosage}
          placeholder="e.g. 1 pipette (optional)"
          placeholderTextColor={colors.label3}
          style={styles.input}
        />

        <Text style={styles.label}>Frequency</Text>
        <TextInput
          value={frequency}
          onChangeText={setFrequency}
          placeholder="e.g. Monthly (optional)"
          placeholderTextColor={colors.label3}
          style={styles.input}
        />

        <View style={styles.footer}>
          <AccentButton
            disabled={!name.trim()}
            onPress={() => {
              addMed(pet.id, name.trim(), dosage.trim() || undefined, frequency.trim() || undefined);
              setAddOpen(false);
              reset();
              toast("pill", `${name.trim()} added`, `${pet.name}'s meds list`);
            }}
          >
            Add med
          </AccentButton>
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  addLink: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 24 },
  addLinkLabel: { fontSize: 13, fontFamily: font.semibold, color: colors.accent },
  deleteButton: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  lastGiven: { paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4, fontSize: 12, fontFamily: font.regular, color: colors.label3 },
  empty: { alignItems: "center", paddingHorizontal: 24, paddingVertical: 36 },
  emptyTitle: { marginTop: 12, fontSize: 15, fontFamily: font.semibold, color: colors.label },
  emptyBody: { marginTop: 2, fontSize: 13, fontFamily: font.regular, color: colors.label2, textAlign: "center" },
  sheetTitle: { fontSize: 20, fontFamily: font.bold, letterSpacing: -0.2, color: colors.label },
  sheetSubtitle: { marginTop: 2, fontSize: 13, fontFamily: font.regular, color: colors.label2 },
  label: {
    marginTop: 20,
    marginBottom: 6,
    fontSize: 13,
    fontFamily: font.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: colors.label2,
  },
  input: {
    borderRadius: 12,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: font.medium,
    color: colors.label,
    ...cardShadow,
  },
  footer: { marginTop: 28 },
});
