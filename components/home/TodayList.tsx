import { StyleSheet, View } from "react-native";
import type { Member } from "@/data";
import { clockTime } from "@/lib/format";
import { Text, borderWidth, spacing, useTheme } from "@/ui";
import type { TodayItem } from "./today";

/** Today's entries as flat rows with hairline dividers; time right-aligned. */
export function TodayList({ items, members }: { items: TodayItem[]; members: Member[] }) {
  const { colors } = useTheme();
  const showWho = members.length > 1;

  return (
    <View style={styles.wrap}>
      <Text variant="title" accessibilityRole="header">
        Today
      </Text>
      {items.length === 0 ? (
        <Text tone="ink2" style={styles.empty}>
          Nothing logged yet today.
        </Text>
      ) : (
        <View>
          {items.map((i, idx) => {
            const who = showWho && i.memberId ? members.find((m) => m.id === i.memberId)?.name : undefined;
            const time = clockTime(i.ts);
            return (
              <View
                key={i.id}
                accessible
                accessibilityLabel={`${i.title}, ${time}${who ? `, by ${who}` : ""}`}
                style={[styles.row, idx > 0 && { borderTopWidth: borderWidth, borderTopColor: colors.border }]}
              >
                <View style={styles.body}>
                  <Text variant="headline" numberOfLines={1}>
                    {i.title}
                  </Text>
                  {who ? (
                    <Text variant="footnote" tone="ink2">
                      {who}
                    </Text>
                  ) : null}
                </View>
                <Text tone="ink2">{time}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  empty: { paddingVertical: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 56, paddingVertical: spacing.sm },
  body: { flex: 1 },
});
