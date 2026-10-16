import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import type { Pet } from "@/data";
import { Icon, PressableScale, Sheet, Text, borderWidth, spacing, useTheme } from "@/ui";

/** The pet-name dropdown: switch pet, or add one. A small sheet, flat. */
export function PetMenu({
  open,
  onClose,
  pets,
  selectedId,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  pets: Pet[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <Sheet open={open} onClose={onClose}>
      <View style={styles.list}>
        {pets.map((p) => (
          <PressableScale
            key={p.id}
            onPress={() => {
              onSelect(p.id);
              onClose();
            }}
            haptic="select"
            accessibilityRole="button"
            accessibilityLabel={p.name}
            accessibilityState={{ selected: p.id === selectedId }}
            style={[styles.row, { borderBottomColor: colors.border }]}
          >
            <Text variant="headline" style={styles.name}>
              {p.name}
            </Text>
            {p.id === selectedId ? <Icon name="check" size={22} color={colors.ink} /> : null}
          </PressableScale>
        ))}
        <PressableScale
          onPress={() => {
            onClose();
            router.push("/pet/new");
          }}
          haptic="tap"
          accessibilityRole="button"
          accessibilityLabel="Add pet"
          style={styles.row}
        >
          <Text variant="headline" style={styles.name}>
            Add pet
          </Text>
          <Icon name="plus" size={22} color={colors.ink} />
        </PressableScale>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", minHeight: 56, borderBottomWidth: borderWidth, borderBottomColor: "transparent" },
  name: { flex: 1 },
});
