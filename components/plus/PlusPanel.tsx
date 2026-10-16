import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { BackHandler, Keyboard, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type Pet } from "@/data";
import { useReduceMotion } from "@/lib/a11y";
import { Icon, PressableScale, Text, shadow, spacing, useTheme } from "@/ui";
import type { FormId } from "./careMeta";
import { PLUS_MARGIN, PLUS_SIZE, plusBottom } from "./layout";
import { CARD_PAD, FOOTER, PanelBody, PhaseContext, type PanelPhase } from "./PanelBody";
import { SavePill } from "./parts";

const MAX_WIDTH = 360;
const GAP = 12;
/** Space kept clear above the card when it is as tall as the screen allows. */
const TOP_GAP = spacing.lg;

/** Organic grow: ~6% overshoot, 70% of the way after ~130ms. */
const GROW = { damping: 18, stiffness: 180 } as const;
/** Height following a level change: quick and nearly critically damped. */
const SETTLE = { damping: 24, stiffness: 240 } as const;
const SHRINK_MS = 280;
/** Rows start fading out first; the card waits this long before shrinking. */
const CLOSE_LEAD_MS = 60;
const REVEAL_AFTER_MS = 130;

function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

export interface PlusPanelProps {
  /** The pet everything logs for (the one selected on Home). */
  pet: Pet | undefined;
  /** Open straight at this form (the `step` param). */
  initialForm: FormId | null;
  open: boolean;
  onClose: () => void;
  /** Fires once the card has shrunk back into the + (the route pops here). */
  onClosed: () => void;
}

/**
 * The + panel. One black rounded surface that starts exactly on the + button (same
 * corner, 60pt circle) and grows up and to the left into the card while the + turns
 * into the x in the card's bottom-right corner. Closing plays it backwards.
 *
 * Hosted by the transparent-modal `/log` route, so the real + button sits underneath
 * and is covered pixel for pixel by the circle at the start and end of the morph.
 *
 * Height: the levels live in a ScrollView whose single in-flow child is measured with
 * onLayout; the card animates its own height to min(measured, room on screen), so the
 * measured content never depends on the card's current size (its width is fixed at the
 * final card width and the card just clips it).
 */
export function PlusPanel({ pet, initialForm, open, onClose, onClosed }: PlusPanelProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height: screenH } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const keyboard = useKeyboardHeight();

  const cardW = Math.min(MAX_WIDTH, width * 0.85);
  const anchor = plusBottom(insets.bottom);
  const typing = keyboard > 0;
  const cardBottom = typing ? keyboard + GAP : anchor;
  const maxH = Math.max(PLUS_SIZE, screenH - cardBottom - insets.top - TOP_GAP);

  const [contentH, setContentH] = useState(0);
  const target = contentH > 0 ? Math.max(PLUS_SIZE, Math.min(contentH, maxH)) : PLUS_SIZE;
  const [phase, setPhase] = useState<PanelPhase>("hidden");

  const w = useSharedValue(PLUS_SIZE);
  const h = useSharedValue(PLUS_SIZE);
  const bottom = useSharedValue(anchor);
  const rot = useSharedValue(0);
  const scrim = useSharedValue(0);
  const cardOpacity = useSharedValue(reduceMotion ? 0 : 1);
  const contentOpacity = useSharedValue(0);

  const started = useRef(false);
  const closing = useRef(false);
  const appliedHeight = useRef(PLUS_SIZE);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const afterClose = useRef<(() => void) | null>(null);

  /** The route pops, unless a button asked for another screen to take its place. */
  const popped = () => (afterClose.current ? afterClose.current() : onClosed());

  // OPEN: wait for the first measurement, then grow the circle into the card.
  useEffect(() => {
    if (!open || contentH === 0 || started.current) return;
    started.current = true;
    appliedHeight.current = target;
    if (reduceMotion) {
      w.set(cardW);
      h.set(target);
      rot.set(1);
      cardOpacity.set(withTiming(1, { duration: 120 }));
      scrim.set(withTiming(1, { duration: 120 }));
      setPhase("shown");
      return;
    }
    w.set(withSpring(cardW, GROW));
    h.set(withSpring(target, GROW));
    rot.set(withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }));
    scrim.set(withTiming(1, { duration: 240 }));
    revealTimer.current = setTimeout(() => setPhase("shown"), REVEAL_AFTER_MS);
  }, [open, contentH, target, cardW, reduceMotion, w, h, rot, scrim, cardOpacity]);

  useEffect(() => {
    if (phase === "shown") contentOpacity.set(withTiming(1, { duration: 160 }));
  }, [phase, contentOpacity]);

  // LEVEL CHANGES (and a growing note field): the card follows the measured height.
  useEffect(() => {
    if (!started.current || closing.current || appliedHeight.current === target) return;
    appliedHeight.current = target;
    h.set(reduceMotion ? target : withSpring(target, SETTLE));
  }, [target, reduceMotion, h]);

  // The card lifts above the keyboard and settles back afterwards.
  useEffect(() => {
    bottom.set(withTiming(cardBottom, { duration: 220, easing: Easing.out(Easing.cubic) }));
  }, [cardBottom, bottom]);

  // CLOSE: rows fade, the card shrinks into the + circle, the x turns back, then the route pops.
  useEffect(() => {
    if (open) return;
    if (revealTimer.current) clearTimeout(revealTimer.current);
    if (!started.current) {
      popped();
      return;
    }
    closing.current = true;
    setPhase("closing");
    Keyboard.dismiss();
    contentOpacity.set(withTiming(0, { duration: 90 }));
    const finish = (done?: boolean) => {
      if (done) runOnJS(popped)();
    };
    if (reduceMotion) {
      scrim.set(withTiming(0, { duration: 100 }));
      cardOpacity.set(withTiming(0, { duration: 100 }, finish));
      return;
    }
    const ease = Easing.inOut(Easing.cubic);
    scrim.set(withDelay(CLOSE_LEAD_MS, withTiming(0, { duration: SHRINK_MS - 40 })));
    rot.set(withDelay(CLOSE_LEAD_MS, withTiming(0, { duration: SHRINK_MS, easing: ease })));
    h.set(withDelay(CLOSE_LEAD_MS, withTiming(PLUS_SIZE, { duration: SHRINK_MS, easing: ease })));
    w.set(withDelay(CLOSE_LEAD_MS, withTiming(PLUS_SIZE, { duration: SHRINK_MS, easing: ease }, finish)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once when `open` turns false
  }, [open]);

  useEffect(
    () => () => {
      if (revealTimer.current) clearTimeout(revealTimer.current);
      [w, h, rot, scrim, cardOpacity, contentOpacity, bottom].forEach(cancelAnimation);
    },
    [w, h, rot, scrim, cardOpacity, contentOpacity, bottom],
  );

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));
  const cardStyle = useAnimatedStyle(() => {
    const grown = Math.min(1, Math.max(0, (w.value - PLUS_SIZE) / (cardW - PLUS_SIZE)));
    return {
      width: w.value,
      height: h.value,
      bottom: bottom.value,
      opacity: cardOpacity.value,
      // 30 (a true circle at 60pt) easing to the card's 28.
      borderRadius: Math.min(Math.min(w.value, h.value) / 2, 30 - 2 * grown),
    };
  });
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  const crossStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value * 45}deg` }] }));

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Dismiss" />
      </Animated.View>

      <Animated.View
        accessibilityViewIsModal
        style={[styles.card, shadow.float, { backgroundColor: colors.inverse, right: PLUS_MARGIN, maxHeight: maxH + 40 }, cardStyle]}
      >
        <Animated.View style={[styles.content, { width: cardW }, contentStyle]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            scrollEnabled={contentH > target}
          >
            <View onLayout={(e) => setContentH(Math.ceil(e.nativeEvent.layout.height))}>
              <PhaseContext.Provider value={phase}>
                {pet ? (
                  <PanelBody pet={pet} initialForm={initialForm} onDone={onClose} />
                ) : (
                  <View style={styles.empty}>
                    <Text variant="headline" tone="inverse">
                      Add a pet first
                    </Text>
                    <Text variant="callout" tone="inverse2">
                      Then tap + to log their day.
                    </Text>
                    <SavePill
                      label="Add pet"
                      onPress={() => {
                        afterClose.current = () => router.replace("/pet/new");
                        onClose();
                      }}
                    />
                  </View>
                )}
              </PhaseContext.Provider>
            </View>
          </ScrollView>
        </Animated.View>

        {/* The + button itself: it never moves, it turns into the x. */}
        <PressableScale
          onPress={onClose}
          haptic="tap"
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={styles.close}
        >
          <Animated.View style={crossStyle}>
            <Icon name="plus" size={28} color={colors.inverseInk} />
          </Animated.View>
        </PressableScale>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: { position: "absolute", overflow: "hidden" },
  content: { position: "absolute", top: 0, right: 0, bottom: 0 },
  empty: { gap: spacing.lg, paddingTop: CARD_PAD, paddingHorizontal: CARD_PAD, paddingBottom: (FOOTER - 52) / 2 },
  close: { position: "absolute", right: 0, bottom: 0, width: PLUS_SIZE, height: PLUS_SIZE, alignItems: "center", justifyContent: "center" },
});

