import { ScrollView, StyleSheet } from "react-native";
import { Mascot } from "@/components/mascot";
import type { Pet } from "@/data";
import { Chip, PressableScale, borderWidth, spacing, useTheme } from "@/ui";

const SIZE = 52;

interface PetPickerProps {
  pets: Pet[];
  selectedId: string;
  allPets: boolean;
  onSelect: (id: string) => void;
  onToggleAll: () => void;
}

/** Header of the log sheet: round pet avatars plus an "All pets" chip. */
export function PetPicker({ pets, selectedId, allPets, onSelect, onToggleAll }: PetPickerProps) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll}>
      {pets.map((p) => {
        const on = allPets || p.id === selectedId;
        return (
          <PressableScale
            key={p.id}
            onPress={() => onSelect(p.id)}
            haptic="select"
            accessibilityRole="button"
            accessibilityLabel={p.name}
            accessibilityState={{ selected: on }}
            style={[styles.avatar, { backgroundColor: colors.tones.butter.bg, borderColor: on ? colors.ink : colors.border }]}
          >
            <Mascot species={p.species} size={44} animated={false} />
          </PressableScale>
        );
      })}
      <Chip label="All pets" icon="heart" selected={allPets} onPress={onToggleAll} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: { gap: spacing.md, alignItems: "center", paddingVertical: spacing.xs },
  avatar: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
