import { useEffect, useState } from "react";
import { Dimensions, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useA11yPrefs } from "@/lib/a11y";
import { colors } from "@/lib/theme";

const SCREEN_H = Dimensions.get("window").height;

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
    .onUpdate((e) => {
      dragY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 90 || e.velocityY > 900) {
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
  const [panelH, setPanelH] = useState(0);
  const panelStyle = useAnimatedStyle(() => {
    const travel = panelH || SCREEN_H * 0.5;
    return { transform: [{ translateY: (1 - progress.value) * travel + dragY.value }] };
  });

  if (!mounted) return null;
  // Never let a sheet climb under the status bar; leave a comfortable gap at the
  // top so the drag handle and first line are always clear of the notch. The
  // inner scroll gets whatever's left, so nothing is hidden off the bottom.
  const topGap = insets.top + 24;
  const maxPanelH = SCREEN_H - topGap;
  const body = <View style={{ paddingBottom: insets.bottom + 20 }}>{children}</View>;
  return (
    <Modal transparent visible statusBarTranslucent onRequestClose={onClose} animationType="none">
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
            onLayout={(e) => setPanelH(e.nativeEvent.layout.height)}
          >
            <GestureDetector gesture={pan}>
              <View style={styles.handleZone}>
                <View style={styles.handle} />
              </View>
            </GestureDetector>
            {scrollable ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                // Leave room for the handle zone (~29) so the last row isn't clipped.
                style={{ maxHeight: maxPanelH - 29 }}
              >
                {body}
              </ScrollView>
            ) : (
              body
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: "rgba(18, 18, 24, 0.35)" },
  backdropSolid: { backgroundColor: "rgba(18, 18, 24, 0.72)" },
  kav: { justifyContent: "flex-end" },
  panel: {
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
  handleZone: { alignItems: "center", paddingTop: 10, paddingBottom: 14 },
  handle: { width: 36, height: 5, borderRadius: 999, backgroundColor: "rgba(25, 25, 32, 0.18)" },
});
