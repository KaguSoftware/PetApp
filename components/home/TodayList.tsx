import { StyleSheet, View } from "react-native";
import { CARE } from "@/components/log/careMeta";
import type { CareLog, Member } from "@/data";
import { Card, Icon, Text, spacing, useTheme } from "@/ui";
import { relativeTime } from "./format";

function detail(l: CareLog): string | null {
  if (l.grams) return `${l.grams} g`;
  if (l.durationMinutes) return `${l.durationMinutes} min`;
  return l.note;
}

export function TodayList({ logs, members, now, petName }: { logs: CareLog[]; members: Member[]; now: number; petName: string }) {
  const { colors } = useTheme();
  const showWho = members.length > 1;

  return (
    <View style={styles.wrap}>
      <Text variant="title" accessibilityRole="header">
        Today
      </Text>
      {logs.length === 0 ? (
        <Card>
          <Text variant="headline">Nothing yet today</Text>
          <Text tone="ink2">Tap + when {petName} has been looked after.</Text>
        </Card>
      ) : (
        <Card style={styles.list}>
          {logs.map((l) => {
            const meta = CARE[l.type];
            const who = showWho ? members.find((m) => m.id === l.memberId)?.name : undefined;
            const extra = detail(l);
            const when = relativeTime(l.ts, now);
            return (
              <View key={l.id} style={styles.row} accessible accessibilityLabel={`${meta.label}, ${when}${who ? `, by ${who}` : ""}`}>
                <View style={[styles.disc, { backgroundColor: colors.bg }]}>
                  <Icon name={meta.icon} size={22} color={colors.ink} />
                </View>
                <View style={styles.body}>
                  <Text variant="headline" numberOfLines={1}>
                    {meta.label}
                    {extra ? <Text tone="ink2">{`  ${extra}`}</Text> : null}
                  </Text>
                  <Text variant="callout" tone="ink2">
                    {when}
                    {who ? ` · ${who}` : ""}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  list: { gap: spacing.lg, paddingVertical: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 44 },
  disc: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  body: { flex: 1 },
});
