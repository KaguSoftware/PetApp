import { ScrollView, StyleSheet } from "react-native";
import type { Pet } from "@/data";
import { Chip, spacing } from "@/ui";
import type { CategoryFilter } from "./model";

const TYPES: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "care", label: "Care" },
  { id: "weight", label: "Weight" },
  { id: "health", label: "Health" },
  { id: "notes", label: "Notes" },
];

export interface FilterBarProps {
  pets: Pet[];
  petId: string | null;
  category: CategoryFilter;
  onPet: (id: string | null) => void;
  onCategory: (c: CategoryFilter) => void;
}

export function FilterBar({ pets, petId, category, onPet, onCategory }: FilterBarProps) {
  return (
    <>
      {pets.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityLabel="Filter by pet">
          <Chip label="All pets" selected={petId === null} onPress={() => onPet(null)} />
          {pets.map((p) => (
            <Chip key={p.id} label={p.name} selected={petId === p.id} onPress={() => onPet(p.id)} />
          ))}
        </ScrollView>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityLabel="Filter by type">
        {TYPES.map((t) => (
          <Chip key={t.id} label={t.label} selected={category === t.id} onPress={() => onCategory(t.id)} />
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
});
