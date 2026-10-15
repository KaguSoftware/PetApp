import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Mascot } from "@/components/mascot";
import { usePets } from "@/data";
import { PillButton, useTheme } from "@/ui";
import { Row, Section } from "./parts";

export function PetsSection() {
  const { colors } = useTheme();
  const pets = usePets();
  return (
    <Section title="Your pets" tone="peach">
      {pets.map((p) => (
        <Row
          key={p.id}
          label={p.name}
          hint={p.breed ?? undefined}
          chevron
          onPress={() => router.push(`/pet/${p.id}`)}
          left={
            <View style={[styles.avatar, { backgroundColor: colors.surface }]}>
              <Mascot species={p.species} size={40} animated={false} />
            </View>
          }
        />
      ))}
      <PillButton label="Add a pet" icon="plus" variant="secondary" size="sm" onPress={() => router.push("/pet/new")} />
    </Section>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
