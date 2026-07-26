import { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { FadeOutUp, SlideInUp, runOnJS } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icons";
import { useStore } from "@/lib/store";
import { font, radius, useColors, type Colors } from "@/lib/theme";

/**
 * Tile tone derives from the icon name, mirroring the web toast API:
 * alert/trash = red, check/star = green, flame = orange (streaks), else accent.
 */
function tone(colors: Colors, icon: string): { tint: string; bg: string } {
  if (icon === "alert" || icon === "trash") return { tint: colors.red, bg: colors.redSoft };
  if (icon === "check" || icon === "star") return { tint: colors.green, bg: colors.greenSoft };
  if (icon === "flame") return { tint: colors.orange, bg: colors.orangeSoft };
  return { tint: colors.accent, bg: colors.accentSoft };
}

/**
 * A single top banner — the standard mobile in-app notification: slides down
 * from under the status bar, auto-dismisses, tap or swipe up to clear.
 *
 * ONE at a time. The store's toast() replaces rather than appends (see
 * lib/store.tsx), so this renders `toasts[toasts.length - 1]` and nothing else.
 * The previous bottom-anchored stack grew upward past the middle of the screen
 * during an activity catch-up batch, which is what this replaces.
 *
 * The reason toasts were moved OFF the top once before: a full-width card sat
 * over the header island and made coins/bell/gear untappable for its whole
 * lifetime. That's addressed here rather than reverted into — the wrap is
 * `pointerEvents="box-none"` so only the banner itself takes touches, the
 * banner is one compact row, and both tap and swipe-up dismiss it immediately.
 */
export default function Toasts() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  // A user-initiated dismissal uses stopNotifications, not dismissToast: it
  // also cancels the rest of a queued activity catch-up batch. Swiping one
  // away means "stop showing me these", not "show me the next one".
  const { toasts, stopNotifications } = useStore();
  const insets = useSafeAreaInsets();

  const t = toasts[toasts.length - 1];
  // Hooks must run unconditionally — build the gesture before the early return.
  const swipeUp = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(-8)
        .failOffsetY(12)
        .onEnd((e) => {
          if (e.translationY < -24 || e.velocityY < -500) runOnJS(stopNotifications)();
        }),
    [stopNotifications]
  );
  if (!t) return null;

  const { tint, bg } = tone(colors, t.icon);
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 8 }]}>
      <GestureDetector gesture={swipeUp}>
        <Animated.View key={t.id} entering={SlideInUp.duration(260)} exiting={FadeOutUp.duration(180)}>
          <Pressable style={styles.toast} onPress={stopNotifications} accessibilityRole="alert" android_ripple={null}>
            <View style={[styles.tile, { backgroundColor: bg }]}>
              <Icon name={t.icon} size={18} color={tint} />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.title} numberOfLines={1}>
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
                android_ripple={null}
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
      </GestureDetector>
      {/* Grabber hint: reads as "this can be flicked away", the same affordance
          iOS puts on its own banners. */}
      <View pointerEvents="none" style={styles.grabber} />
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  wrap: { position: "absolute", left: 12, right: 12, zIndex: 100 },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    // iOS: a real soft shadow. Android: a hairline border instead of
    // `elevation` — an elevation shadow rasterizes to the view's own layout
    // box and leaves a sharp rectangular smudge poking past the rounded
    // corners during the exit animation. Matches NotificationBell /
    // SettingsButton.
    ...(Platform.OS === "android"
      ? { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.sep }
      : {
          shadowColor: "#000",
          shadowOpacity: 0.14,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
        }),
    // On web, Pressable renders as a focusable div[role=button] — the browser's
    // default focus outline is a sharp, unrounded rectangle that pokes out past
    // this card's borderRadius.
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  },
  grabber: {
    alignSelf: "center",
    marginTop: 5,
    width: 34,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.sep,
  },
  tile: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  textCol: { flex: 1 },
  title: { fontSize: 14, fontFamily: font.semibold, color: colors.label },
  body: { fontSize: 13, fontFamily: font.regular, color: colors.label2, marginTop: 1 },
  action: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    minHeight: 36,
    justifyContent: "center",
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  },
  actionLabel: { fontSize: 14, fontFamily: font.semibold, color: colors.accent },
});
