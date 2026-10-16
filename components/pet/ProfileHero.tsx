import { StyleSheet, View } from "react-native";
import type { Pet } from "@/data";
import { ageLabel } from "@/lib/format";
import { spacing, Text } from "@/ui";

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Just the name and a grey line under it: no card, no art. */
export function ProfileHero({ pet }: { pet: Pet }) {
  const age = ageLabel(pet.birthDate);
  const line = [cap(pet.species), pet.breed, age].filter(Boolean).join(" · ");
  return (
    <View style={styles.wrap}>
      <Text variant="largeTitle" accessibilityRole="header">
        {pet.name}
      </Text>
      <Text tone="ink2">{line}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs, paddingVertical: spacing.sm },
});
