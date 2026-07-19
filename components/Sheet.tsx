import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useA11yPrefs } from "@/lib/a11y";
import { colors } from "@/lib/theme";

/**
 * Bottom sheet, matching the web demo's Sheet: backdrop tap or swipe-down to
 * dismiss, drag handle, scrollable content capped at 88% height. Built on the
 * native Modal so it always overlays tab bar + headers.
 */
export default function Sheet({
  open,
  onClose,
  children,
  scrollable = true,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  scrollable?: boolean;
}) {
  const insets = useSafeAreaInsets();
  // Read live — a module-scope Dimensions.get() never updates, so after a
  // rotation or split-screen resize the panel was capped to a stale height and
  // could run off the bottom of the screen, taking its footer button with it.
  const { height: SCREEN_H } = useWindowDimensions();
  const { reduceTransparency } = useA11yPrefs();
  const [mounted, setMounted] = useState(open);
  const progress = useSharedValue(0); // 0 hidden → 1 shown

  useEffect(() => {
    if (open) {
      setMounted(true);
      progress.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    } else if (mounted) {
      progress.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) }, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
  }, [open, mounted, progress]);

  const dragY = useSharedValue(0);
  const pan = Gesture.Pan()
    // Claim downward drags immediately so the handle reliably drags the sheet
    // (rather than the gesture never activating), but bail on upward drags so
    // they fall through to the content's own scrolling.
    .activeOffsetY(6)
    .failOffsetY(-10)
    .onUpdate((e) => {
      dragY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 70 || e.velocityY > 600) {
        runOnJS(onClose)();
        dragY.value = withTiming(0, { duration: 250 });
      } else {
        dragY.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) });
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  // The panel is height-driven by its content and slides up from below; animate
  // it in by its own measured height so short sheets rise just enough and tall
  // ones don't overshoot. Falls back to half-screen until measured.
  //
  // Measured ONCE per open: content that grows while the sheet is open (the
  // BreedField wheel expanding, EditStatSheet swapping wheel↔TextField) would
  // otherwise re-run this mid-animation and make the panel jump — or, on close,
  // leave a half-visible strip that swallows taps meant for the screen behind.
  const [panelH, setPanelH] = useState(0);
  const panelStyle = useAnimatedStyle(() => {
    const travel = panelH || SCREEN_H * 0.5;
    return { transform: [{ translateY: (1 - progress.value) * travel + dragY.value }] };
  });

  if (!mounted) return null;
  // Cap the sheet to a comfortable fraction of the screen — never let it climb
  // to the status bar. It sizes to its content up to this cap; taller content
  // scrolls inside. This keeps it from sliding up too far.
  const topGap = insets.top + 24;
  const maxPanelH = Math.min(SCREEN_H * 0.8, SCREEN_H - topGap);
  const body = <View style={{ paddingBottom: insets.bottom + 20 }}>{children}</View>;
  return (
    <Modal transparent visible statusBarTranslucent onRequestClose={onClose} animationType="none">
      {/* A RN Modal mounts in its own native window, OUTSIDE the app's root
          GestureHandlerRootView — so RNGH needs a fresh root here or the drag
          handle's Pan never attaches and swipe-to-dismiss is dead on Android. */}
      <GestureHandlerRootView style={styles.flex}>
        <View style={styles.root}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              reduceTransparency ? styles.backdropSolid : styles.backdrop,
              backdropStyle,
            ]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
          </Animated.View>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.kav} pointerEvents="box-none">
            <Animated.View
              style={[styles.panel, { maxHeight: maxPanelH }, panelStyle]}
              onLayout={(e) => {
                const h = e.nativeEvent.layout.height;
                setPanelH((prev) => (prev === 0 ? h : prev));
              }}
            >
              <GestureDetector gesture={pan}>
                <View style={styles.handleZone}>
                  <View style={styles.handle} />
                </View>
              </GestureDetector>
              {scrollable ? (
                // No maxHeight here: the panel's own maxHeight plus flexShrink
                // lets flexbox derive the scroll height from whatever the handle
                // zone actually occupies. Hardcoding `maxPanelH - 33` silently
                // clipped the last rows — where every sheet's primary button is —
                // whenever the handle's padding changed.
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  {body}
                </ScrollView>
              ) : (
                body
              )}
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: "rgba(18, 18, 24, 0.35)" },
  backdropSolid: { backgroundColor: "rgba(18, 18, 24, 0.72)" },
  // flex:1 is load-bearing — a content-sized KeyboardAvoidingView measures its
  // own frame to compute the keyboard inset, and without it that inset came out
  // ~0, leaving every text-input sheet's Save button behind the keyboard.
  kav: { flex: 1, justifyContent: "flex-end" },
  panel: {
    flexShrink: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: -8 },
    elevation: 16,
  },
  // Constrained to the grabber itself (alignSelf, not a full-width row) so the
  // pan only claims the handle — a full-width zone made the top 33pt of every
  // sheet drag-only, swallowing taps aimed at the content beneath it.
  handleZone: { alignSelf: "center", alignItems: "center", paddingTop: 12, paddingBottom: 16, paddingHorizontal: 28 },
  handle: { width: 44, height: 5, borderRadius: 999, backgroundColor: "rgba(25, 25, 32, 0.22)" },
});
