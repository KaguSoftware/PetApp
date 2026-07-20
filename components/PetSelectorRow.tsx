import { useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import PetAvatar from "@/components/PetAvatar";
import { PressableScale } from "@/components/ui";
import { useReduceMotion } from "@/lib/a11y";
import type { Pet } from "@/lib/data";
import { colors, font, withAlpha } from "@/lib/theme";

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
}: {
  pets: Pet[];
  selectedId: string;
  onSelect: (petId: string) => void;
}) {
  if (pets.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rowContent}
      style={styles.row}
    >
      {pets.map((p) => (
        <PetSelectorItem key={p.id} pet={p} selected={p.id === selectedId} onPress={() => onSelect(p.id)} />
      ))}
    </ScrollView>
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
  row: { marginTop: 12, marginHorizontal: -4 },
  rowContent: { paddingHorizontal: 4, gap: 14 },
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
});
