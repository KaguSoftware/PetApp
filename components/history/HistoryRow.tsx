import { StyleSheet, View } from "react-native";
import type { Pet } from "@/data";
import { clockTime } from "@/lib/format";
import { borderWidth, HIT, PressableScale, spacing, Text, useTheme } from "@/ui";
import type { HistoryItem } from "./model";

export interface HistoryRowProps {
  item: HistoryItem;
  pet: Pet | undefined;
  showPet: boolean;
  who: string | null;
  onPress: (item: HistoryItem) => void;
}

/** Plain row: title and detail on the left, time (and pet when there are several) on the right. */
export function HistoryRow({ item, pet, showPet, who, onPress }: HistoryRowProps) {
  const { colors } = useTheme();
  const time = clockTime(item.ts);
  const petName = showPet && pet ? pet.name : null;
  const meta = [time, who].filter(Boolean).join(" · ");
  return (
    <PressableScale
      onPress={() => onPress(item)}
      haptic="tap"
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${meta}`}
      accessibilityHint="Opens details"
      style={[styles.row, { borderBottomColor: colors.border }]}
    >
      <View style={styles.body}>
        <Text variant="body" numberOfLines={2}>
          {item.title}
        </Text>
        {item.detail ? (
          <Text variant="callout" tone="ink2" numberOfLines={1}>
            {item.detail}
          </Text>
        ) : null}
      </View>
      <View style={styles.side}>
        <Text variant="callout" tone="ink2">
          {time}
        </Text>
        {petName ? (
          <Text variant="footnote" tone="ink3" numberOfLines={1}>
            {petName}
          </Text>
        ) : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: HIT + spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: borderWidth,
  },
  body: { flex: 1, gap: 1 },
  side: { alignItems: "flex-end", gap: 1, maxWidth: 110 },
});
