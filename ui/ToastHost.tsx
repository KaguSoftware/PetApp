import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReduceMotion } from "@/lib/a11y";
import { Icon } from "./icons";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";
import { useTheme } from "./theme";
import { radius, shadow, spacing } from "./tokens";

/** Structurally identical to `Toast` from @/data, so the host stays decoupled from it. */
export interface ToastItem {
  id: string;
  kind: "info" | "error" | "undo";
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface ToastHostProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  /** Lift above the floating tab bar. */
  bottomOffset?: number;
}

const LIFETIME_MS = { info: 3500, error: 5000, undo: 6500 } as const;

function ToastRow({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), LIFETIME_MS[toast.kind]);
    return () => clearTimeout(timer);
  }, [toast.id, toast.kind, onDismiss]);

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.springify().damping(14)}
      exiting={reduceMotion ? undefined : FadeOutDown.duration(160)}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.toast, shadow.float, { backgroundColor: colors.ink }]}
    >
      <Text variant="bodyStrong" tone="onInk" style={styles.text}>
        {toast.text}
      </Text>
      {toast.actionLabel ? (
        <PressableScale
          onPress={() => {
            toast.onAction?.();
            onDismiss(toast.id);
          }}
          haptic="tap"
          accessibilityRole="button"
          accessibilityLabel={toast.actionLabel}
          style={styles.action}
        >
          <Text variant="label" style={{ color: colors.amber }}>
            {toast.actionLabel}
          </Text>
        </PressableScale>
      ) : null}
      <PressableScale
        onPress={() => onDismiss(toast.id)}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        style={styles.close}
      >
        <Icon name="close" size={18} color={colors.onInk} />
      </PressableScale>
    </Animated.View>
  );
}

/** Renders the data layer's toast queue. Mount once at the root, above the navigator. */
export function ToastHost({ toasts, onDismiss, bottomOffset = 0 }: ToastHostProps) {
  const insets = useSafeAreaInsets();
  if (toasts.length === 0) return null;
  return (
    <View pointerEvents="box-none" style={[styles.host, { paddingBottom: insets.bottom + spacing.lg + bottomOffset }]}>
      {toasts.slice(-3).map((t) => (
        <ToastRow key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end", paddingHorizontal: spacing.lg, gap: spacing.sm },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    borderRadius: radius.pill,
    paddingLeft: spacing.xl,
    paddingRight: spacing.xs,
    gap: spacing.xs,
  },
  text: { flex: 1, paddingVertical: spacing.md },
  action: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.sm },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
});
