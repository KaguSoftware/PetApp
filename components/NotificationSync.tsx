import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useStore } from "@/lib/store";
import { syncScheduledNotifications } from "@/lib/notifications";

/**
 * Headless bridge between the store and the OS notification queue. Watches
 * reminders (and pets, for the body copy) and re-syncs the scheduled local
 * notifications ~1.5s after changes settle, plus whenever the app returns to
 * the foreground. Tapping a delivered notification routes to /reminders.
 * Mounted once in the root layout; renders nothing.
 */
export default function NotificationSync() {
  const { state } = useStore();
  const { reminders, pets } = state;
  const latest = useRef({ reminders, pets });
  latest.current = { reminders, pets };
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced re-sync on data changes — bursts (repeat roll-forwards, undo
  // restores, hydration) collapse into one scheduling pass.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      syncScheduledNotifications(latest.current.reminders, latest.current.pets);
    }, 1500);
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [reminders, pets]);

  // Re-sync when the app comes back to the foreground — reminders may have
  // come due (or been completed on another device) while backgrounded.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (status) => {
      if (status === "active") syncScheduledNotifications(latest.current.reminders, latest.current.pets);
    });
    return () => sub.remove();
  }, []);

  // Route notification taps to the reminders screen.
  useEffect(() => {
    let sub: { remove: () => void } | undefined;
    try {
      sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const url = response.notification.request.content.data?.url;
        try {
          router.push(typeof url === "string" && url.startsWith("/") ? (url as "/reminders") : "/reminders");
        } catch {
          // no-op — navigation not ready
        }
      });
    } catch {
      // no-op — notifications unavailable on this platform/runtime
    }
    return () => sub?.remove();
  }, []);

  return null;
}
