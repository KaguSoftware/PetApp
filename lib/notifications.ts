import * as Notifications from "expo-notifications";
import { nextRepeatDue, type Activity, type CareSchedule, type Pet, type Reminder } from "@/lib/data";
import { careItemLabel, occurrenceLogged, scheduleOccurrences } from "@/lib/careStatus";

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

/** How far ahead schedule slots are turned into pending notifications. */
const SCHEDULE_HORIZON_MS = 7 * 86_400_000;

type PendingNotification = { at: number; title: string; body?: string; url: string };

/**
 * Mirror the store's reminders AND care schedules into the OS notification
 * queue: clear everything, then schedule the soonest future occurrences (up to
 * 60 — iOS caps pending local notifications at 64), merged and sorted so the
 * nearest events always win. Past-due repeating reminders roll forward with
 * nextRepeatDue; past-due one-shots are skipped (they're already surfaced
 * in-app as overdue). A schedule slot that's already been logged for its
 * window (someone fed the pet ahead of time) is skipped — pass the current
 * activities so this stays in sync with the dashboard's done state.
 */
export async function syncScheduledNotifications(
  reminders: Reminder[],
  pets: Pet[],
  schedules: CareSchedule[] = [],
  activities: Activity[] = []
): Promise<void> {
  try {
    const now = Date.now();
    const fromReminders: PendingNotification[] = reminders
      .filter((r) => !r.done)
      .map((r) => ({
        reminder: r,
        at: r.due > now ? r.due : r.repeatKind ? nextRepeatDue(r.due, r.repeatKind, r.repeatInterval, now) : 0,
      }))
      .filter((x) => x.at > now)
      .map(({ reminder, at }) => ({
        at,
        title: reminder.title,
        body: pets.find((p) => p.id === reminder.petId)?.name,
        url: "/reminders",
      }));

    const fromSchedules: PendingNotification[] = schedules.flatMap((s) => {
      const pet = pets.find((p) => p.id === s.petId);
      if (!pet) return [];
      const label = careItemLabel(pet, s.type, s.medId);
      return scheduleOccurrences(s, now, SCHEDULE_HORIZON_MS)
        .filter((o) => o.ts > now && !occurrenceLogged(pet, s, o.ts, activities))
        .map((o) => ({
          at: o.ts,
          title: `${pet.name} — ${o.slot.label ?? label}`,
          body: o.slot.label ? label : undefined,
          url: "/logs",
        }));
    });

    const upcoming = [...fromReminders, ...fromSchedules].sort((a, b) => a.at - b.at).slice(0, MAX_SCHEDULED);

    // Check permission BEFORE cancelling. This runs on every reminder change
    // and every foreground, so cancelling first meant a user who denied
    // notifications had their OS queue wiped on each pass — and if permission
    // was later granted, everything scheduled before the denial was long gone.
    if (upcoming.length === 0) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return;
    }

    const ok = await ensurePermissions();
    if (!ok) return;

    await Notifications.cancelAllScheduledNotificationsAsync();

    for (const pending of upcoming) {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: pending.title,
            body: pending.body,
            data: { url: pending.url },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(pending.at) },
        });
      } catch {
        // no-op — skip this one, keep scheduling the rest
      }
    }
  } catch {
    // no-op — scheduling is best-effort
  }
}
