import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icons";
import { useStore } from "@/lib/store";
import { colors, font } from "@/lib/theme";

/**
 * Top-right bell on tab pages, badged with the outstanding care-alert count.
 * Tapping opens the activity hub. When there ARE alerts, a small "clear" button
 * appears beside it to dismiss every notification at once — reachable from any
 * page's header (handy while the alert machinery is noisy in development).
 */
export default function NotificationBell() {
  const router = useRouter();
  const { state, dismissAllAlerts } = useStore();
  // Care alerts deduped by petId|title, matching the web's badge count.
  const seen = new Set<string>();
  let count = 0;
  for (const r of state.reminders) {
    if (!r.alert || r.done) continue;
    const key = `${r.petId}|${r.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    count++;
  }
  return (
    <View style={styles.row}>
      {count > 0 ? (
        <Pressable
          onPress={dismissAllAlerts}
          accessibilityRole="button"
          accessibilityLabel="Clear all notifications"
          hitSlop={8}
          style={({ pressed }) => [styles.clear, pressed && { opacity: 0.6 }]}
        >
          <Icon name="xmark" size={13} color={colors.label2} />
          <Text style={styles.clearLabel}>Clear</Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => router.push("/activity")}
        accessibilityLabel={count > 0 ? `Activity, ${count} alerts` : "Activity"}
        hitSlop={8}
        style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.6 }]}
      >
        <Icon name="bell" size={21} color={colors.label} />
        {count > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>{count > 9 ? "9+" : count}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  clear: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: colors.fill,
  },
  clearLabel: { fontSize: 13, fontFamily: font.semibold, color: colors.label2 },
  wrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.sep,
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
  badgeLabel: { fontSize: 10, fontFamily: font.bold, color: "#fff" },
});
