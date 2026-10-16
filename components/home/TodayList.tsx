import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import type { Member } from "@/data";
import { clockTime } from "@/lib/format";
import { Text, borderWidth, layout, useItemMotion, useTheme } from "@/ui";
import type { TodayItem } from "./today";

function TodayRow({ item, index, who, first }: { item: TodayItem; index: number; who: string | undefined; first: boolean }) {
  const { colors } = useTheme();
  const motion = useItemMotion(index);
  const time = clockTime(item.ts);
  return (
    <Animated.View
      {...motion}
      accessible
      accessibilityLabel={`${item.title}, ${time}${who ? `, by ${who}` : ""}`}
      style={[styles.row, !first && { borderTopWidth: borderWidth, borderTopColor: colors.border }]}
    >
      <View style={styles.body}>
        <Text variant="headline" numberOfLines={1}>
          {item.title}
        </Text>
        {who ? (
          <Text variant="footnote" tone="ink2">
            {who}
          </Text>
        ) : null}
      </View>
      <Text tone="ink2">{time}</Text>
    </Animated.View>
  );
}

/** Today's entries as flat rows with hairline dividers; time right-aligned. New entries fade in and the rest slide to make room. */
export function TodayList({ items, members, streak }: { items: TodayItem[]; members: Member[]; streak: number }) {
  const showWho = members.length > 1;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text variant="title" accessibilityRole="header">
          Today
        </Text>
        {streak > 0 ? <Text variant="callout" tone="ink2">{`${streak} day${streak === 1 ? "" : "s"}`}</Text> : null}
      </View>
      {items.length === 0 ? (
        <Text tone="ink2" style={styles.empty}>
          Nothing logged yet today.
        </Text>
      ) : (
        <View>
          {items.map((i, idx) => (
            <TodayRow
              key={i.id}
              item={i}
              index={idx}
              first={idx === 0}
              who={showWho && i.memberId ? members.find((m) => m.id === i.memberId)?.name : undefined}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: layout.headerGap },
  head: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  empty: { paddingVertical: layout.rowPadV },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.item,
    minHeight: layout.rowMinHeight,
    paddingVertical: layout.rowPadV,
  },
  body: { flex: 1 },
});
