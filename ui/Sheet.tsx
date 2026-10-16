import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReduceMotion } from "@/lib/a11y";
import { useTheme } from "./theme";
import { radius, spacing } from "./tokens";

export interface SheetPanelProps {
  open: boolean;
  onClose: () => void;
  /** Fires after the exit animation has finished (used to pop a route-hosted sheet). */
  onClosed?: () => void;
  children: React.ReactNode;
}

/**
 * The sheet itself (scrim + sliding panel, drag-to-dismiss from the grabber and
 * the panel body) with no Modal around it, so a transparent-modal ROUTE can host
 * it directly. `Sheet` below wraps it in a native Modal for in-screen use.
 *
 * Children that scroll vertically should sit inside their own ScrollView with
 * `bounces={false}`; the pan only claims clearly downward drags.
 */
export function SheetPanel({ open, onClose, onClosed, children }: SheetPanelProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(0);
  const dragY = useSharedValue(0);
  const panelH = useSharedValue(screenH * 0.5);

  const closedRef = useRef(onClosed);
  closedRef.current = onClosed;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  // Both pans can fire onEnd for one drag that starts on the grabber; close once.
  const closeFired = useRef(false);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancelAnimation(progress);
      cancelAnimation(dragY);
    };
  }, [progress, dragY]);

  const fireClosed = useCallback(() => {
    if (mounted.current) closedRef.current?.();
  }, []);
  const requestClose = useCallback(() => {
    if (closeFired.current) return;
    closeFired.current = true;
    closeRef.current();
  }, []);

  useEffect(() => {
    if (open) {
      closeFired.current = false;
      dragY.value = 0;
      progress.value = reduceMotion
        ? withTiming(1, { duration: 120 })
        : withSpring(1, { damping: 22, stiffness: 260, mass: 0.9 });
    } else {
      progress.value = withTiming(0, { duration: 240, easing: Easing.bezier(0.32, 0.72, 0, 1) }, (done) => {
        if (done) runOnJS(fireClosed)();
      });
    }
  }, [open, reduceMotion, progress, dragY, fireClosed]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(8)
        .failOffsetX([-24, 24])
        .onUpdate((e) => {
          dragY.value = Math.max(0, e.translationY);
        })
        .onEnd((e) => {
          if (dragY.value > 80 || (e.velocityY > 700 && dragY.value > 8)) {
            runOnJS(requestClose)();
          } else {
            dragY.value = withSpring(0, { damping: 20, stiffness: 300 });
          }
        }),
    [dragY, requestClose],
  );

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * panelH.value + dragY.value }],
  }));

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
      </Animated.View>
      <KeyboardAvoidingView
        behavior="padding"
        pointerEvents="box-none"
        style={styles.kav}
      >
        <GestureDetector gesture={pan}>
          <Animated.View
            onLayout={(e) => {
              panelH.value = e.nativeEvent.layout.height;
            }}
            style={[
              styles.panel,
              {
                backgroundColor: colors.surface,
                maxHeight: screenH - insets.top - spacing["2xl"],
                paddingBottom: insets.bottom + spacing.xl,
              },
              panelStyle,
            ]}
          >
            <View style={styles.handleZone}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>
            {children}
          </Animated.View>
        </GestureDetector>
      </KeyboardAvoidingView>
    </View>
  );
}

export interface SheetProps extends Omit<SheetPanelProps, "onClosed"> {
  /** Fires once the Modal has unmounted; safe moment to present another window. */
  onClosed?: () => void;
}

/** Bottom sheet in a native Modal, so it overlays tab bar and headers. */
export function Sheet({ open, onClose, onClosed, children }: SheetProps) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);

  const handleClosed = useCallback(() => {
    setMounted(false);
    onClosed?.();
  }, [onClosed]);

  if (!mounted) return null;
  return (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={onClose}>
      {/* A Modal is a separate native window outside the app's gesture root. */}
      <GestureHandlerRootView style={styles.root}>
        <SheetPanel open={open} onClose={onClose} onClosed={handleClosed}>
          {children}
        </SheetPanel>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  // flex:1 is load-bearing: KeyboardAvoidingView measures its own frame for the inset.
  kav: { flex: 1, justifyContent: "flex-end" },
  panel: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    flexShrink: 1,
  },
  handleZone: { alignSelf: "center", paddingTop: spacing.md, paddingBottom: spacing.lg, paddingHorizontal: spacing["3xl"] },
  handle: { width: 44, height: 5, borderRadius: radius.pill },
});
