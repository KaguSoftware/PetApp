import { useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import PetAvatar from "@/components/PetAvatar";
import { PressableScale } from "@/components/ui";
import { useReduceMotion } from "@/lib/a11y";
import type { Pet } from "@/lib/data";
import { colors, font, radius, withAlpha } from "@/lib/theme";

/**
 * Horizontal avatar-row pet selector — one tap to switch pets. The selected
 * pet gets an accent ring and a gentle scale-up; names sit beneath. Rendered
 * even for a single pet, where it doubles as the "whose dashboard is this"
 * header.
 */
export default function PetSelectorRow({
  pets,
  selectedId,
  onSelect,
  onAdd,
}: {
  pets: Pet[];
  selectedId: string;
  onSelect: (petId: string) => void;
  /** When set, a trailing "+" tile opens the add-a-pet flow (Pets tab). */
  onAdd?: () => void;
}) {
  if (pets.length === 0) return null;
  return (
    <View style={styles.card}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rowContent}
        style={styles.row}
      >
        {pets.map((p) => (
          <PetSelectorItem key={p.id} pet={p} selected={p.id === selectedId} onPress={() => onSelect(p.id)} />
        ))}
        {onAdd ? (
          <PressableScale haptic onPress={onAdd} accessibilityRole="button" accessibilityLabel="Add a pet">
            <View style={styles.item}>
              <View style={[styles.avatarWrap, styles.avatarUnselected]}>
                <View style={styles.addCircle}>
                  <Text style={styles.addGlyph}>+</Text>
                </View>
              </View>
              <Text numberOfLines={1} style={styles.name}>
                Add
              </Text>
            </View>
          </PressableScale>
        ) : null}
      </ScrollView>
    </View>
  );
}

function PetSelectorItem({ pet, selected, onPress }: { pet: Pet; selected: boolean; onPress: () => void }) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(selected ? 1 : 0.92);
  useEffect(() => {
    const target = selected ? 1 : 0.92;
    scale.value = reduceMotion ? target : withTiming(target, { duration: 200, easing: Easing.out(Easing.quad) });
  }, [selected, reduceMotion, scale]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <PressableScale
      haptic
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={pet.name}
      accessibilityState={{ selected }}
    >
      <View style={styles.item}>
        <Animated.View style={[styles.avatarWrap, selected ? styles.avatarSelected : styles.avatarUnselected, anim]}>
          <PetAvatar pet={pet} size="md" />
        </Animated.View>
        <Text numberOfLines={1} style={[styles.name, selected ? styles.nameSelected : null]}>
          {pet.name}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.sep,
    paddingVertical: 14,
    overflow: "hidden",
  },
  row: {},
  rowContent: { paddingHorizontal: 14, gap: 14 },
  item: { alignItems: "center", width: 72, paddingVertical: 2 },
  avatarWrap: {
    padding: 3,
    borderRadius: 34,
    borderWidth: 2,
  },
  avatarSelected: { borderColor: colors.accent, backgroundColor: withAlpha(colors.accent, 0.08) },
  avatarUnselected: { borderColor: "transparent" },
  name: {
    marginTop: 4,
    maxWidth: 72,
    fontSize: 13,
    fontFamily: font.medium,
    color: colors.label2,
    textAlign: "center",
  },
  nameSelected: { fontFamily: font.semibold, color: colors.label },
  // "+" tile sized to match PetAvatar md (56pt) inside the same ring padding.
  addCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: withAlpha(colors.accent, 0.1),
  },
  addGlyph: { fontSize: 26, lineHeight: 30, fontFamily: font.medium, color: colors.accent },
});
