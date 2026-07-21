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
      {/* The bell glyph's mass sits in the top half of its box (wide body up top,
          thin clapper below), so geometric-centering leaves it reading ~2pt high
          next to the gear (which is centered on cy=12). Nudge it down to align
          the optical centers. iOS only — that's where the bigger 25pt icon made
          the offset visible in the header row. */}
      <View style={Platform.OS === "ios" ? { transform: [{ translateY: 2 }] } : null}>
        <Icon name="bell" size={Platform.OS === "ios" ? 25 : 21} color={colors.label} />
      </View>
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
    // Android's native header (react-native-screens) clips headerRight to the
    // control's own laid-out box — padding on an ANCESTOR view doesn't expand
    // that clip region, it just shifts the row, so a badge hanging outside the
    // bell's 38x38 pill still got its corner shaved regardless of outer
    // padding. Pinning the badge fully INSIDE the pill (0/0 instead of -3/-3)
    // means it never exceeds the control's own bounds, so there's nothing left
    // for the native clip to cut — this holds on both platforms, iOS included.
    top: 0,
    right: 0,
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
