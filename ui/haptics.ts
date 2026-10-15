import * as Haptics from "expo-haptics";
import { hapticsEnabled } from "@/lib/a11y";

export type HapticKind = "tap" | "select" | "success" | "heavy";

/** Fire-and-forget; honours the in-app haptics preference and never throws. */
export function haptic(kind: HapticKind = "tap"): void {
  if (!hapticsEnabled()) return;
  const run =
    kind === "select"
      ? Haptics.selectionAsync()
      : kind === "success"
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.impactAsync(kind === "heavy" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
  run.catch(() => {
    // unsupported device (web, some Android): feedback is optional
  });
}
