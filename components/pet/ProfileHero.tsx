import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Mascot } from "@/components/mascot";
import { useLogs, type Pet, type Species } from "@/data";
import { computeMood } from "@/lib/mood";
import { ageLabel } from "@/lib/format";
import { Card, Chip, spacing, Text, type Tone } from "@/ui";

const TONE: Partial<Record<Species, Tone>> = { dog: "ice", cat: "peach" };

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function ProfileHero({ pet }: { pet: Pet }) {
  const logs = useLogs({ petId: pet.id });
  const { mood } = useMemo(() => computeMood(pet, logs, Date.now()), [pet, logs]);
  const age = ageLabel(pet.birthDate);
  return (
    <Card tone={TONE[pet.species] ?? "mint"} style={styles.card}>
      <Mascot species={pet.species} mood={mood} size={200} animated accessibilityLabel={`${pet.name} the ${pet.species}`} />
      <Text variant="display" accessibilityRole="header" style={styles.name}>
        {pet.name}
      </Text>
      <View style={styles.chips}>
        <Chip label={cap(pet.species)} />
        {pet.breed ? <Chip label={pet.breed} /> : null}
        {age ? <Chip label={age} /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", gap: spacing.md },
  name: { textAlign: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm },
});
