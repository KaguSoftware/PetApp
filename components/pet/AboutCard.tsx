import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { editPet, type Pet } from "@/data";
import { formatDate, isValidDateString, toDateString } from "@/lib/format";
import { Card, Chip, Icon, PillButton, Sheet, spacing, Text, TextField, useTheme } from "@/ui";

type Gender = Pet["gender"];

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.row}>
      <Text tone="ink2" variant="callout" style={styles.label}>
        {label}
      </Text>
      <Text variant="headline" style={styles.value}>
        {value ?? "Not set"}
      </Text>
    </View>
  );
}

function EditSheet({ pet, open, onClose }: { pet: Pet; open: boolean; onClose: () => void }) {
  const [name, setName] = useState(pet.name);
  const [breed, setBreed] = useState(pet.breed ?? "");
  const [birth, setBirth] = useState(pet.birthDate ?? "");
  const [gender, setGender] = useState<Gender>(pet.gender);
  const [notes, setNotes] = useState(pet.notes ?? "");
  const birthTrim = birth.trim();
  const birthFormatOk = birthTrim === "" || isValidDateString(birthTrim);
  const birthFuture = birthFormatOk && birthTrim > toDateString(Date.now());
  const birthOk = birthFormatOk && !birthFuture;
  const canSave = name.trim().length > 0 && birthOk;

  const save = () => {
    onClose();
    editPet(pet.id, {
      name: name.trim(),
      breed: breed.trim() || null,
      birthDate: birth.trim() || null,
      gender,
      notes: notes.trim() || null,
    }).catch(() => undefined); // data layer rolls back and toasts
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <ScrollView bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
        <Text variant="title" accessibilityRole="header">
          About {pet.name}
        </Text>
        <TextField label="Name" value={name} onChangeText={setName} />
        <TextField label="Breed" value={breed} onChangeText={setBreed} placeholder="Optional" />
        <TextField
          label="Birthday (YYYY-MM-DD)"
          value={birth}
          onChangeText={setBirth}
          placeholder="2021-04-18"
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
        />
        {!birthOk ? (
          <Text variant="callout" tone="danger">
            {birthFuture ? "That date is in the future." : "Use the format 2021-04-18."}
          </Text>
        ) : null}
        <View style={styles.chips}>
          <Chip label="Girl" selected={gender === "female"} onPress={() => setGender(gender === "female" ? null : "female")} />
          <Chip label="Boy" selected={gender === "male"} onPress={() => setGender(gender === "male" ? null : "male")} />
        </View>
        <TextField label="Notes" multiline value={notes} onChangeText={setNotes} placeholder="Allergies, quirks, favourite toy" />
        <PillButton label="Save" onPress={save} disabled={!canSave} />
      </ScrollView>
    </Sheet>
  );
}

export function AboutCard({ pet }: { pet: Pet }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [rev, setRev] = useState(0);
  const gender = pet.gender === "female" ? "Girl" : pet.gender === "male" ? "Boy" : null;
  return (
    <>
      <Card onPress={() => {
          setRev((r) => r + 1);
          setOpen(true);
        }} accessibilityLabel={`About ${pet.name}. Tap to edit`} style={styles.card}>
        <View style={styles.head}>
          <Text variant="title" style={styles.value}>
            About
          </Text>
          <Icon name="edit" size={20} color={colors.ink} />
        </View>
        <Row label="Breed" value={pet.breed} />
        <Row label="Birthday" value={pet.birthDate ? formatDate(pet.birthDate) : null} />
        <Row label="Gender" value={gender} />
        <Row label="Notes" value={pet.notes} />
      </Card>
      {/* Keyed per open so the form always starts from the saved values. */}
      <EditSheet key={rev} pet={pet} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  head: { flexDirection: "row", alignItems: "center" },
  row: { flexDirection: "row", gap: spacing.md },
  label: { width: 76 },
  value: { flex: 1 },
  form: { gap: spacing.md, paddingBottom: spacing.sm },
  chips: { flexDirection: "row", gap: spacing.sm },
});
