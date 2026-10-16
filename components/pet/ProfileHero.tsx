import { StyleSheet, View } from "react-native";
import type { Pet } from "@/data";
import { ageLabel } from "@/lib/format";
import { Card, Chip, spacing, Text } from "@/ui";

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function ProfileHero({ pet }: { pet: Pet }) {
  const age = ageLabel(pet.birthDate);
  return (
    <Card style={styles.card}>
      <Text variant="largeTitle" accessibilityRole="header" style={styles.name}>
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
