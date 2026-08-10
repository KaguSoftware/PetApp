import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { PageButton } from "@/components/plan/Chapter";
import { PressableScale } from "@/components/ui";
import type { AheadItem } from "@/lib/home";
import { font, useColors, type Colors } from "@/lib/theme";

/**
 * What the family has written down for later — a three-row peek at the queue.
 * Raised alerts sort to the top of it in the model; the queue itself lives in
 * the Inbox, one button down.
 */
export default function AheadPeek({
  items,
  count,
  onOpen,
}: {
  items: AheadItem[];
  /** Open reminders in total — the Inbox button's badge. */
  count: number;
  onOpen: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View>
      {/* Empty prints nothing — the Inbox button below is the whole story. */}
      {items.map((item) => (
          <PressableScale
            key={item.id}
            onPress={onOpen}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}${item.who ? `, ${item.who}` : ""}, ${item.when}`}
          >
            <View style={styles.row}>
              <Text numberOfLines={1} style={styles.label}>
                {item.label}
                {item.who ? <Text style={styles.who}> {item.who}</Text> : null}
              </Text>
              <Text
                style={[
                  styles.when,
                  item.tint === "late" && { color: colors.red },
                  item.tint === "warn" && { color: colors.orange },
                ]}
              >
                {item.when}
              </Text>
            </View>
          </PressableScale>
      ))}
      <View style={styles.action}>
        <PageButton label="Inbox" tint={colors.accent} icon="bell" count={count} size="sm" onPress={onOpen} />
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44, paddingVertical: 5 },
    label: { flex: 1, minWidth: 0, fontSize: 16, fontFamily: font.medium, letterSpacing: -0.2, color: colors.label },
    who: { fontFamily: font.regular, color: colors.label3 },
    when: { fontSize: 14.5, fontFamily: font.semibold, color: colors.label2 },
    action: { marginTop: 14, alignSelf: "flex-start" },
  });
