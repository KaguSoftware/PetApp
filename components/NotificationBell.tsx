import { useRouter } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icons";
import { useStore } from "@/lib/store";
import { colors, font } from "@/lib/theme";

/**
 * Top-right bell on tab pages, badged with the outstanding care-alert count.
 * Tapping opens the activity hub — mirrors the web NotificationBell.
 */
export default function NotificationBell() {
  const router = useRouter();
  const { state } = useStore();
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
    <Pressable
      onPress={() => router.push("/activity")}
      accessibilityLabel={count > 0 ? `Activity, ${count} alerts` : "Activity"}
      accessibilityRole="button"
      // The pill is 38pt; 6pt on every side brings the real touch target to
      // 50pt, comfortably past the 44pt minimum, without overlapping its
      // neighbours (the island's gap is 8).
      hitSlop={6}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.6 }]}
    >
      <Icon name="bell" size={21} color={colors.label} />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>{count > 9 ? "9+" : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    // Keep the card background/border on Android; clear on iOS.
    ...(Platform.OS === "android"
      ? {
          backgroundColor: colors.card,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.sep,
        }
      : null),
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
