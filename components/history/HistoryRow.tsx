import { StyleSheet, View } from "react-native";
import type { Pet } from "@/data";
import { relativeTime } from "@/lib/format";
import { HIT, Icon, PressableScale, radius, spacing, Text, useTheme } from "@/ui";
import type { HistoryItem } from "./model";

export interface HistoryRowProps {
  item: HistoryItem;
  pet: Pet | undefined;
  showPet: boolean;
  who: string | null;
  now: number;
  onPress: (item: HistoryItem) => void;
}

export function HistoryRow({ item, pet, showPet, who, now, onPress }: HistoryRowProps) {
  const { colors } = useTheme();
  const meta = [relativeTime(item.ts, now), who].filter(Boolean).join(" · ");
  return (
    <PressableScale
      onPress={() => onPress(item)}
      haptic="tap"
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${meta}`}
      accessibilityHint="Opens details"
      style={[styles.row, { backgroundColor: colors.surface }]}
    >
      <View style={[styles.disc, { backgroundColor: colors.bg }]}>
        <Icon name={item.icon} size={22} color={colors.ink} />
      </View>
      <View style={styles.body}>
        <Text variant="headline" numberOfLines={2}>
          {item.title}
        </Text>
        {item.detail ? (
          <Text variant="callout" tone="ink2" numberOfLines={1}>
            {item.detail}
          </Text>
        ) : null}
        <Text variant="caption" tone="ink3">
          {meta}
        </Text>
      </View>
      {showPet && pet ? (
        <Text variant="caption" tone="ink2" numberOfLines={1}>
          {pet.name}
        </Text>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: HIT + spacing.xl,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  disc: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 1 },
});
