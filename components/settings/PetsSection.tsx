import { router } from "expo-router";
import { usePets } from "@/data";
import { Row, Section } from "./parts";

export function PetsSection() {
  const pets = usePets();
  return (
    <Section title="Your pets">
      {pets.map((p) => (
        <Row key={p.id} label={p.name} hint={p.breed ?? undefined} chevron onPress={() => router.push(`/pet/${p.id}`)} />
      ))}
      <Row label="Add a pet" icon="plus" onPress={() => router.push("/pet/new")} />
    </Section>
  );
}
