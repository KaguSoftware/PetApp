import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "./icons";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";
import { useTheme } from "./theme";
import { radius, spacing } from "./tokens";

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
  /** Lift above the tab bar. */
  bottomOffset?: number;
}

const LIFETIME_MS = { info: 3500, error: 5000, undo: 6500 } as const;

/** A small "Saved · Undo" bar in the inverse colours. No animation. */
function ToastRow({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const { colors } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), LIFETIME_MS[toast.kind]);
    return () => clearTimeout(timer);
  }, [toast.id, toast.kind, onDismiss]);

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.toast, { backgroundColor: colors.inverse }]}
    >
      <Text variant="callout" tone="inverse" style={styles.text}>
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
          <Text variant="headline" tone="inverse">
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
        <Icon name="close" size={16} color={colors.inverseInk2} />
      </PressableScale>
    </View>
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
  host: { ...StyleSheet.absoluteFill, justifyContent: "flex-end", alignItems: "center", paddingHorizontal: spacing.lg, gap: spacing.sm },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    maxWidth: "100%",
    borderRadius: radius.pill,
    paddingLeft: spacing.xl,
    paddingRight: spacing.xs,
    gap: spacing.xs,
  },
  text: { flexShrink: 1, paddingVertical: spacing.md },
  action: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.sm },
  close: { width: 40, height: 44, alignItems: "center", justifyContent: "center" },
});
