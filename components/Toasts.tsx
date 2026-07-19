import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeOutDown, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icons";
import { useStore } from "@/lib/store";
import { colors, font, radius } from "@/lib/theme";

/**
 * Tile tone derives from the icon name, mirroring the web toast API:
 * alert/trash = red, check/star = green, flame = orange (streaks), else accent.
 */
function tone(icon: string): { tint: string; bg: string } {
  if (icon === "alert" || icon === "trash") return { tint: colors.red, bg: colors.redSoft };
  if (icon === "check" || icon === "star") return { tint: colors.green, bg: colors.greenSoft };
  if (icon === "flame") return { tint: colors.orange, bg: colors.orangeSoft };
  return { tint: colors.accent, bg: colors.accentSoft };
}

export default function Toasts() {
  const { toasts, dismissToast, stopNotifications } = useStore();
  const insets = useSafeAreaInsets();
  if (toasts.length === 0) return null;
  return (
    // Anchored to the BOTTOM, above the home indicator and tab bar. Toasts used
    // to sit at `insets.top + 8` — inside the navigation bar's own band — where
    // each full-width toast card physically covered the header island, making
    // coins/bell/gear untappable for as long as a toast was on screen.
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + TAB_BAR_CLEARANCE }]}>
      {/* When several stack up, a small button clears them all at once (and
          cancels any still queued) so overlays don't pile on the screen. */}
      {toasts.length > 1 ? (
        <Animated.View entering={SlideInDown.duration(200)} exiting={FadeOutDown.duration(160)} style={styles.clearRow}>
          <Pressable
            onPress={stopNotifications}
            accessibilityRole="button"
            accessibilityLabel="Clear all notifications"
            hitSlop={8}
            style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.7 }]}
          >
            <Icon name="xmark" size={13} color={colors.white} />
            <Text style={styles.clearLabel}>Clear all</Text>
          </Pressable>
        </Animated.View>
      ) : null}
      {/* Cap the visible stack: the wrap is absolutely positioned and doesn't
          scroll, so an unbounded list would push the oldest toasts off-screen
          where they can't be read or dismissed. "Clear all" handles the rest. */}
      {toasts.slice(-MAX_VISIBLE).map((t) => {
        const { tint, bg } = tone(t.icon);
        return (
          <Animated.View key={t.id} entering={SlideInDown.duration(240)} exiting={FadeOutDown.duration(180)}>
            <Pressable style={styles.toast} onPress={() => dismissToast(t.id)} accessibilityRole="alert">
              <View style={[styles.tile, { backgroundColor: bg }]}>
                <Icon name={t.icon} size={18} color={tint} />
              </View>
              <View style={styles.textCol}>
                <Text style={styles.title} numberOfLines={2}>
                  {t.title}
                </Text>
                {t.body ? (
                  <Text style={styles.body} numberOfLines={2}>
                    {t.body}
                  </Text>
                ) : null}
              </View>
              {t.action ? (
                <Pressable
                  style={styles.action}
                  hitSlop={8}
                  onPress={(e) => {
                    e.stopPropagation();
                    t.action!.onClick();
                  }}
                >
                  <Text style={styles.actionLabel}>{t.action.label}</Text>
                </Pressable>
              ) : null}
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

/**
 * Toasts float above the tab bar. `insets.bottom` covers the home indicator /
 * system nav, but not the tab bar itself, so clear it explicitly — 56 is the
 * standard bar height (matching ANDROID_TAB_BAR_HEIGHT in Screen.tsx) plus a
 * little breathing room.
 */
const TAB_BAR_CLEARANCE = 64;

/** Most toasts shown at once; older ones stay in the store for "Clear all". */
const MAX_VISIBLE = 3;

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 12, right: 12, gap: 8, zIndex: 100 },
  clearRow: { alignItems: "center" },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(28, 28, 35, 0.82)",
  },
  clearLabel: { fontSize: 13, fontFamily: font.semibold, color: colors.white },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  tile: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  textCol: { flex: 1 },
  title: { fontSize: 14, fontFamily: font.semibold, color: colors.label },
  body: { fontSize: 13, fontFamily: font.regular, color: colors.label2, marginTop: 1 },
  action: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.accentSoft, minHeight: 36, justifyContent: "center" },
  actionLabel: { fontSize: 14, fontFamily: font.semibold, color: colors.accent },
});
