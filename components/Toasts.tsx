import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeOutUp, SlideInUp } from "react-native-reanimated";
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
  const { toasts, dismissToast } = useStore();
  const insets = useSafeAreaInsets();
  if (toasts.length === 0) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 8 }]}>
      {toasts.map((t) => {
        const { tint, bg } = tone(t.icon);
        return (
          <Animated.View key={t.id} entering={SlideInUp.duration(240)} exiting={FadeOutUp.duration(180)}>
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

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 12, right: 12, gap: 8, zIndex: 100 },
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
