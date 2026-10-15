import { router } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { Mascot } from "@/components/mascot";
import type { Pet } from "@/data";
import { Icon, PressableScale, borderWidth, spacing, useTheme } from "@/ui";

const SIZE = 52;

export function PetSwitcher({ pets, selectedId, onSelect }: { pets: Pet[]; selectedId: string; onSelect: (id: string) => void }) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll}>
      {pets.map((p) => {
        const on = p.id === selectedId;
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
      <PressableScale
        onPress={() => router.push("/pet/new")}
        haptic="tap"
        accessibilityRole="button"
        accessibilityLabel="Add a pet"
        style={[styles.avatar, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Icon name="plus" size={22} color={colors.ink2} />
      </PressableScale>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: { gap: spacing.md, paddingVertical: spacing.xs },
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
