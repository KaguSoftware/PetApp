import { ScrollView, StyleSheet } from "react-native";
import type { Pet } from "@/data";
import { Chip, spacing } from "@/ui";

interface PetPickerProps {
  pets: Pet[];
  selectedId: string;
  allPets: boolean;
  onSelect: (id: string) => void;
  onToggleAll: () => void;
}

/** Header of the log sheet: round pet avatars plus an "All pets" chip. */
export function PetPicker({ pets, selectedId, allPets, onSelect, onToggleAll }: PetPickerProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll}>
      {pets.map((p) => {
        const on = allPets || p.id === selectedId;
        return (
          <Chip key={p.id} label={p.name} selected={on} onPress={() => onSelect(p.id)} />
        );
      })}
      <Chip label="All pets" icon="heart" selected={allPets} onPress={onToggleAll} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: { gap: spacing.md, alignItems: "center", paddingVertical: spacing.xs },
});
