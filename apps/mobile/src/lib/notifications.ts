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
export async function syncScheduledReminders(preferences: NotificationPreferenceDto[]): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await ensureAndroidChannel();

  // Reminders can now be deleted, so reconciling only over the rows we were
  // handed would leave a deleted one firing forever. Cancel everything this
  // app scheduled, then re-add what should exist.
  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  for (const item of scheduled) {
    if (item.identifier.startsWith('reminder-')) {
      await Notifications.cancelScheduledNotificationAsync(item.identifier).catch(() => {});
    }
  }

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
