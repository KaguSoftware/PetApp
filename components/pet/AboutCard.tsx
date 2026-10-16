import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import type { Pet } from "@/data";
import { formatDate } from "@/lib/format";
import { Card, Icon, layout, Text, useTheme } from "@/ui";

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.row}>
      <Text tone="ink2" variant="callout" style={styles.label}>
        {label}
      </Text>
      <Text variant="callout" tone={value ? "ink" : "ink3"} style={styles.value}>
        {value ?? "Not set"}
      </Text>
    </View>
  );
}

export function AboutCard({ pet }: { pet: Pet }) {
  const { colors } = useTheme();
  const gender = pet.gender === "female" ? "Girl" : pet.gender === "male" ? "Boy" : null;
  return (
    <Card
      onPress={() => router.push({ pathname: "/pet/[id]/edit", params: { id: pet.id } })}
      accessibilityLabel={`About ${pet.name}. Tap to edit`}
      style={styles.card}
    >
      <View style={styles.head}>
        <Text variant="headline" style={styles.value}>
          About
        </Text>
        <Icon name="edit" size={20} color={colors.ink} />
      </View>
      <Row label="Breed" value={pet.breed} />
      <Row label="Birthday" value={pet.birthDate ? formatDate(pet.birthDate) : null} />
      <Row label="Gender" value={gender} />
      <Row label="Notes" value={pet.notes} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: layout.item },
  head: { flexDirection: "row", alignItems: "center" },
  row: { flexDirection: "row", gap: layout.item },
  label: { width: 76 },
  value: { flex: 1 },
});
