import type { NotificationPreferenceDto } from '@fitness-app/shared';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { registerPushToken } from '../api/notifications.api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const REMINDER_CONTENT: Partial<Record<NotificationPreferenceDto['category'], { title: string; body: string }>> = {
  water: { title: 'Stay hydrated 💧', body: 'Time for a glass of water — log it when you do!' },
  sleep: { title: 'Wind down 🌙', body: "It's almost your bedtime — get ready to log your sleep." },
  // Fires at a fixed time regardless of whether anything was actually
  // logged today — a true "you haven't logged yet" check needs the app to
  // ask the server at fire time, which local notifications can't do (that
  // needs push notifications + a server-side scheduler, not built yet).
  // Kept the copy honest about that rather than implying it's smarter than it is.
  goal_progress: {
    title: 'How’s today going? 📝',
    body: "Take a moment to log what you've had so far — even a quick voice note helps.",
  },
};

/**
 * Copy for a user-added reminder. Their own label is the title — it is what
 * they typed and what they will recognise on the lock screen.
 */
function contentFor(pref: NotificationPreferenceDto): { title: string; body: string } | null {
  if (pref.label) {
    return { title: pref.label, body: 'Tap to log it while it’s fresh.' };
  }
  return REMINDER_CONTENT[pref.category] ?? null;
}

/**
 * Keyed by row id, NOT category: a user can hold several reminders of the
 * same category (a lunch and a dinner nudge, say), and a category-derived
 * identifier would make the second silently overwrite the first.
 */
function identifierFor(id: string): string {
  return `reminder-${id}`;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Reconciles OS-scheduled local notifications with the user's saved
 * preferences. Always cancels the existing scheduled reminder for a
 * category before (maybe) re-scheduling it, so toggling a reminder off, or
 * changing its time, never leaves a stale or duplicate notification behind.
 */
/**
 * Registers this device for server-sent reminders.
 *
 * Returns true when the server can now deliver, which is what lets the
 * caller stop scheduling locally. The device timezone goes up with the
 * token: a reminder time is local wall-clock, so the server cannot fire
 * "21:00" without knowing where the user is.
 */
export async function registerForPushNotifications(): Promise<boolean> {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return false;

    await ensureAndroidChannel();

    // Required for a push token on a real build; absent in some dev contexts,
    // in which case Expo can still resolve the project itself.
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;

    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    if (!token) return false;

    await registerPushToken({
      token,
      platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    return true;
  } catch {
    // Expo Go without a project id, a simulator, or no network — all mean
    // "server delivery unavailable", which the local fallback covers.
    return false;
  }
}

/** Removes every locally-scheduled reminder this app created. */
export async function cancelLocalReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  for (const item of scheduled) {
    if (item.identifier.startsWith('reminder-')) {
      await Notifications.cancelScheduledNotificationAsync(item.identifier).catch(() => {});
    }
  }
}

/**
 * Reconciles OS-scheduled local notifications with the user's saved
 * preferences.
 *
 * This is the FALLBACK path. When the device is registered for push, the
 * server owns delivery and local schedules are cleared instead — otherwise
 * every reminder would arrive twice, once from each source.
 */
export async function syncScheduledReminders(preferences: NotificationPreferenceDto[]): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await ensureAndroidChannel();
  await cancelLocalReminders();

  for (const pref of preferences) {
    if (!pref.enabled || !pref.preferredTime) continue;

    const [hourStr, minuteStr] = pref.preferredTime.split(':');
    const hour = Number(hourStr);
    const minute = Number(minuteStr);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) continue;

    const content = contentFor(pref);
    if (!content) continue;

    await Notifications.scheduleNotificationAsync({
      identifier: identifierFor(pref.id),
      content: { title: content.title, body: content.body, data: { category: pref.category, id: pref.id } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: 'reminders',
      },
    });
  }
}

/**
 * Points reminder delivery at whichever mechanism is actually available.
 *
 * Server push is preferred: it survives a reinstall, a new phone, and
 * cleared app data, none of which a locally-scheduled notification does.
 * Local scheduling stays as the fallback so a user who declines push, or
 * runs in a context without a push token, still gets reminded.
 */
export async function syncReminderDelivery(preferences: NotificationPreferenceDto[]): Promise<void> {
  const usingPush = await registerForPushNotifications();
  if (usingPush) {
    await cancelLocalReminders();
    return;
  }
  await syncScheduledReminders(preferences);
}
