import type { NotificationPreferenceDto } from '@fitness-app/shared';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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

/** Only these categories have a reminder actually wired up to fire — the rest of NotificationCategory exists for future phases (meal_suggestion, goal_progress, etc.). */
const REMINDER_CAPABLE_CATEGORIES = Object.keys(REMINDER_CONTENT) as NotificationPreferenceDto['category'][];

function identifierFor(category: string): string {
  return `reminder-${category}`;
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
export async function syncScheduledReminders(preferences: NotificationPreferenceDto[]): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await ensureAndroidChannel();

  const byCategory = new Map(preferences.map((pref) => [pref.category, pref]));

  for (const category of REMINDER_CAPABLE_CATEGORIES) {
    const identifier = identifierFor(category);
    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});

    const pref = byCategory.get(category);
    if (!pref?.enabled || !pref.preferredTime) continue;

    const [hourStr, minuteStr] = pref.preferredTime.split(':');
    const hour = Number(hourStr);
    const minute = Number(minuteStr);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) continue;

    const content = REMINDER_CONTENT[category];
    if (!content) continue;

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: { title: content.title, body: content.body, data: { category } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: 'reminders',
      },
    });
  }
}
