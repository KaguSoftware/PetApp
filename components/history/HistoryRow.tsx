import { StyleSheet, View } from "react-native";
import type { Pet } from "@/data";
import { Mascot } from "@/components/mascot";
import { relativeTime } from "@/lib/format";
import { borderWidth, HIT, Icon, PressableScale, radius, spacing, Text, useTheme } from "@/ui";
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
  const tone = colors.tones[item.tone];
  const meta = [relativeTime(item.ts, now), who].filter(Boolean).join(" · ");
  return (
    <PressableScale
      onPress={() => onPress(item)}
      haptic="tap"
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${meta}`}
      accessibilityHint="Opens details"
      style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.disc, { backgroundColor: tone.bg }]}>
        <Icon name={item.icon} size={22} color={tone.fg} />
      </View>
      <View style={styles.body}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {item.title}
        </Text>
        {item.detail ? (
          <Text variant="small" tone="ink2" numberOfLines={1}>
            {item.detail}
          </Text>
        ) : null}
        <Text variant="caption" tone="ink3">
          {meta}
        </Text>
      </View>
      {showPet && pet ? (
        <View style={[styles.avatar, { backgroundColor: colors.tones.butter.bg }]}>
          <Mascot species={pet.species} size={28} animated={false} accessibilityLabel={pet.name} />
        </View>
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
    borderWidth,
  },
  disc: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
