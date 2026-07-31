import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector, GestureHandlerRootView, type PanGesture } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useA11yPrefs, useReduceMotion } from "@/lib/a11y";
import { radius, useColors, type Colors } from "@/lib/theme";

/**
 * The pan that lets a downward drag ANYWHERE on the sheet dismiss it. Inner
 * vertical scrollables (wheel columns, embedded lists) must block it — via
 * `Gesture.Native().blocksExternalGesture(thisPan)` or the `SheetScrollable`
 * wrapper below — or a drag meant to spin/scroll them drags the sheet instead.
 */
export const SheetPanContext = createContext<PanGesture | null>(null);

/** Wrap an inner scrollable so its own drag beats the sheet's drag-to-close. */
export function SheetScrollable({ children }: { children: React.ReactElement }) {
  const pan = useContext(SheetPanContext);
  if (!pan) return children;
  return <GestureDetector gesture={Gesture.Native().blocksExternalGesture(pan)}>{children}</GestureDetector>;
}

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
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  // Read live — a module-scope Dimensions.get() never updates, so after a
  // rotation or split-screen resize the panel was capped to a stale height and
  // could run off the bottom of the screen, taking its footer button with it.
  const { height: SCREEN_H } = useWindowDimensions();
  const { reduceTransparency } = useA11yPrefs();
  const reduceMotion = useReduceMotion();
  const [mounted, setMounted] = useState(open);
  const progress = useSharedValue(0); // 0 hidden → 1 shown

  const dragY = useSharedValue(0);
  // Panel heights — semantics documented at panelStyle below.
  const travelH = useSharedValue(0);
  const liveH = useSharedValue(0);
  // Offset of the sheet's inner ScrollView. Stays 0 for non-scrollable sheets,
  // so the same pan logic covers both modes.
  const scrollY = useSharedValue(0);
  const engaged = useSharedValue(false);
  const dragStart = useSharedValue(0);

  useEffect(() => {
    if (open) {
      setMounted(true);
      closeFired.current = false;
      // The component survives close/reopen (only the Modal unmounts). On a
      // FRESH mount the new ScrollView never reports its initial 0 offset and
      // the panel re-measures via onLayout — so reset both. On a rapid reopen
      // mid-close-animation the old views survive, and their live offset and
      // measured height are still the truth: resetting then would let the
      // content pan engage mid-list and break the entrance travel.
      if (!mounted) {
        scrollY.value = 0;
        travelH.value = 0;
        liveH.value = 0;
      }
      dragY.value = 0;
      engaged.value = false;
      // Spring entrance (high damping — settles fast, no visible overshoot);
      // reduce-motion gets a quick fade-adjacent timing instead of a slide feel.
      progress.value = reduceMotion
        ? withTiming(1, { duration: 120 })
        : withSpring(1, { damping: 26, stiffness: 300, mass: 0.9 });
    } else if (mounted) {
      // Slide down by the panel's CURRENT height — content that grew since the
      // entrance measure (expanding chips, drill views) made the frozen travel
      // too short, so the close left a strip on screen that snapped away when
      // the Modal unmounted. Syncing here is jump-free: at progress 1 the
      // travel term contributes 0. Fast-start ease (no slow ramp) so a close
      // that continues a drag doesn't hitch at the finger's release point.
      if (liveH.value > travelH.value) travelH.value = liveH.value;
      progress.value = withTiming(0, { duration: 240, easing: Easing.bezier(0.32, 0.72, 0, 1) }, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
  }, [open, mounted, progress, reduceMotion, dragY, scrollY, engaged, travelH, liveH]);

  // The gestures are memoized because their IDENTITY matters: inner scrollables
  // hold a block relation against contentPan via SheetPanContext, and a fresh
  // object per render would silently sever it. onClose is reached through a ref
  // so the worklets never need re-creating.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  // Guarded: a drag that starts on the grabber activates BOTH pans (they're
  // mutually simultaneous), so each one's onEnd crosses the dismiss threshold —
  // unguarded, onClose fired twice per handle-swipe. Re-armed on reopen.
  const closeFired = useRef(false);
  const requestClose = useCallback(() => {
    if (closeFired.current) return;
    closeFired.current = true;
    closeRef.current();
  }, []);

  const { handlePan, contentPan, scrollNative } = useMemo(() => {
    const finishDrag = (velocityY: number) => {
      "worklet";
      if (dragY.value > 70 || (velocityY > 600 && dragY.value > 8)) {
        // Hold dragY where the finger left it — the close animation continues
        // the slide from there. Animating dragY back to 0 here fought the
        // close's downward travel, hopping the sheet UP before it fell.
        runOnJS(requestClose)();
      } else {
        dragY.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) });
      }
    };

    const scrollNative = Gesture.Native();

    // The grabber keeps its own UNGATED pan: with the content scrolled partway
    // down, the content pan below refuses to engage — but a drag that starts on
    // the handle should always move the sheet.
    const handlePan = Gesture.Pan()
      .activeOffsetY(6)
      .failOffsetY(-10)
      .onUpdate((e) => {
        dragY.value = Math.max(0, e.translationY);
      })
      .onEnd((e) => finishDrag(e.velocityY));

    // Whole-panel drag-to-close. Runs simultaneously with the inner ScrollView
    // and only "engages" (starts moving the sheet) while that scroll sits at its
    // top — mid-list, the same finger movement is scrolling, not dismissing. The
    // baseline (dragStart) is wherever the finger was when the scroll ran out,
    // so the sheet takes over without a jump; if the finger heads back up and
    // the content starts scrolling again, it hands the gesture back.
    const contentPan = Gesture.Pan()
      .activeOffsetY(6)
      .failOffsetY(-10)
      .onUpdate((e) => {
        if (!engaged.value) {
          if (scrollY.value > 1) return;
          engaged.value = true;
          dragStart.value = e.translationY;
        } else if (scrollY.value > 1 && dragY.value === 0) {
          engaged.value = false;
          return;
        }
        dragY.value = Math.max(0, e.translationY - dragStart.value);
      })
      .onEnd((e) => finishDrag(e.velocityY))
      .onFinalize(() => {
        engaged.value = false;
      });

    contentPan.simultaneousWithExternalGesture(scrollNative, handlePan);
    handlePan.simultaneousWithExternalGesture(contentPan);
    return { handlePan, contentPan, scrollNative };
  }, [dragY, scrollY, engaged, dragStart, requestClose]);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  // The panel is height-driven by its content and slides up from below; animate
  // it in by its own measured height so short sheets rise just enough and tall
  // ones don't overshoot. Falls back to half-screen until measured.
  //
  // travelH is frozen at the FIRST measure per mount (the open-effect resets it
  // whenever the Modal freshly mounts, so every real open re-measures): content
  // that grows while the sheet is open (the BreedField wheel expanding,
  // EditStatSheet swapping wheel↔TextField) would otherwise re-run the style
  // mid-entrance and make the panel jump. liveH tracks EVERY layout so the
  // close-effect can sync the travel to the panel's real, current height —
  // otherwise a since-grown sheet slid down by the stale measure, left a
  // half-visible strip that swallowed taps, then snapped away on unmount.
  const panelStyle = useAnimatedStyle(() => {
    const travel = travelH.value || SCREEN_H * 0.5;
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
            <GestureDetector gesture={contentPan}>
              <Animated.View
                style={[styles.panel, { maxHeight: maxPanelH }, panelStyle]}
                onLayout={(e) => {
                  const h = e.nativeEvent.layout.height;
                  liveH.value = h;
                  if (travelH.value === 0) travelH.value = h;
                }}
              >
                <SheetPanContext.Provider value={contentPan}>
                  <GestureDetector gesture={handlePan}>
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
                    //
                    // bounces={false} is part of drag-to-close: at the top, a
                    // downward drag must move the SHEET, not rubber-band the list.
                    <GestureDetector gesture={scrollNative}>
                      <Animated.ScrollView
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                        overScrollMode="never"
                        onScroll={onScroll}
                        scrollEventThrottle={16}
                      >
                        {body}
                      </Animated.ScrollView>
                    </GestureDetector>
                  ) : (
                    body
                  )}
                </SheetPanContext.Provider>
              </Animated.View>
            </GestureDetector>
          </KeyboardAvoidingView>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
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
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: -8 },
    elevation: 16,
  },
  handleZone: { alignSelf: "center", alignItems: "center", paddingTop: 10, paddingBottom: 12, paddingHorizontal: 28 },
  handle: { width: 36, height: 4, borderRadius: 999, backgroundColor: "rgba(25, 25, 32, 0.16)" },
});
