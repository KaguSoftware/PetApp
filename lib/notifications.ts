import * as Notifications from "expo-notifications";
import { nextRepeatDue, type Pet, type Reminder } from "@/lib/data";

/**
 * Local notification scheduling for reminders. Everything here is guarded so
 * Expo Go on iOS works (local notifications are supported there) and any
 * platform where the module misbehaves simply no-ops instead of crashing.
 */

/** iOS caps pending local notifications at 64 — stay comfortably under it. */
const MAX_SCHEDULED = 60;

// Show banners while the app is foregrounded, matching the in-app toast tone.
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
} catch {
  // no-op — notifications unavailable on this platform/runtime
}

let granted: boolean | null = null;

/**
 * Lazily requests notification permission. Never called at launch — only when
 * there is actually a reminder to schedule, so the OS prompt appears in
 * context. Returns whether notifications are allowed.
 */
export async function ensurePermissions(): Promise<boolean> {
  try {
    if (granted) return true;
    const current = await Notifications.getPermissionsAsync();
    if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
      granted = true;
      return true;
    }
    if (!current.canAskAgain) {
      granted = false;
      return false;
    }
    const req = await Notifications.requestPermissionsAsync();
    granted = req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    return granted;
  } catch {
    return false;
  }
}

/**
 * Fire an immediate local notification confirming an action the user just took.
 * Reports asked for a notification to reach the person who performs an action
 * (not only the reminder-driven ones), so care logging surfaces one right away.
 * Best-effort and silent: if permission isn't granted or the module misbehaves,
 * it no-ops — the in-app toast already covered the confirmation.
 */
export async function notifyActionLogged(title: string, body: string): Promise<void> {
  try {
    const ok = await ensurePermissions();
    if (!ok) return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { url: "/activity" } },
      trigger: null, // deliver now
    });
  } catch {
    // no-op — best-effort
  }
}

/**
 * Mirror the store's reminders into the OS notification queue: clear
 * everything, then schedule the soonest future occurrences (up to 60 — iOS
 * caps pending local notifications at 64). Past-due repeating reminders roll
 * forward with nextRepeatDue; past-due one-shots are skipped (they're already
 * surfaced in-app as overdue).
 */
export async function syncScheduledNotifications(reminders: Reminder[], pets: Pet[]): Promise<void> {
  try {
    const now = Date.now();
    const upcoming = reminders
      .filter((r) => !r.done)
      .map((r) => ({
        reminder: r,
        at: r.due > now ? r.due : r.repeatKind ? nextRepeatDue(r.due, r.repeatKind, r.repeatInterval, now) : 0,
      }))
      .filter((x) => x.at > now)
      .sort((a, b) => a.at - b.at)
      .slice(0, MAX_SCHEDULED);

    await Notifications.cancelAllScheduledNotificationsAsync();
    if (upcoming.length === 0) return;

    const ok = await ensurePermissions();
    if (!ok) return;

    for (const { reminder, at } of upcoming) {
      const pet = pets.find((p) => p.id === reminder.petId);
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: reminder.title,
            body: pet?.name,
            data: { url: "/reminders" },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at) },
        });
      } catch {
        // no-op — skip this one, keep scheduling the rest
      }
    }
  } catch {
    // no-op — scheduling is best-effort
  }
}
