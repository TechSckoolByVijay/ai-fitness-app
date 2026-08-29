import type { PrismaClient } from '@prisma/client';
import type { NotificationCategory } from '@fitness-app/shared';
import type { ExpoPushProvider, PushMessage } from '../../providers/push/expo-push.provider';
import { isReminderDue, localClock } from './due-reminders';

/** Copy for the built-in reminders. A user-added one uses its own label. */
const BUILT_IN_CONTENT: Partial<Record<NotificationCategory, { title: string; body: string }>> = {
  water: { title: 'Stay hydrated 💧', body: 'Time for a glass of water — log it when you do.' },
  sleep: { title: 'Wind down 🌙', body: "It's almost your bedtime — get ready to log your sleep." },
  goal_progress: {
    title: "How's today going? 📝",
    body: "Take a moment to log what you've had so far.",
  },
};

function contentFor(pref: { label: string | null; category: NotificationCategory }) {
  if (pref.label) {
    return { title: pref.label, body: 'Tap to log it while it’s fresh.' };
  }
  return BUILT_IN_CONTENT[pref.category] ?? null;
}

export interface SchedulerDeps {
  prisma: PrismaClient;
  push: ExpoPushProvider;
  log?: (message: string, meta?: Record<string, unknown>) => void;
}

/**
 * One pass of the reminder scheduler.
 *
 * Exported separately from the timer so it can be invoked directly in tests
 * with a fixed `now`, rather than tests having to wait on wall-clock time.
 */
export async function runReminderTick(deps: SchedulerDeps, now: Date = new Date()): Promise<number> {
  const { prisma, push } = deps;

  // Only rows that could possibly fire. Filtering in SQL keeps this cheap as
  // the user count grows — the per-row timezone maths runs in JS, but only
  // for reminders that are actually switched on with a time set.
  const candidates = await prisma.notificationPreference.findMany({
    where: { enabled: true, preferredTime: { not: null } },
    include: { user: { select: { profile: { select: { timeZone: true } } } } },
  });

  const messages: PushMessage[] = [];

  for (const pref of candidates) {
    const timeZone = pref.user.profile?.timeZone ?? null;

    if (!isReminderDue({ ...pref, timeZone }, now)) continue;

    const content = contentFor(pref);
    if (!content) continue;

    // Claim the send before doing it. The conditional WHERE means that if two
    // API replicas tick at the same moment, exactly one update matches and
    // only that replica sends — without this the user gets two notifications.
    const today = localClock(now, timeZone).date;
    const claim = await prisma.notificationPreference.updateMany({
      where: { id: pref.id, OR: [{ lastSentOn: null }, { lastSentOn: { not: today } }] },
      data: { lastSentOn: today },
    });
    if (claim.count === 0) continue;

    const tokens = await prisma.pushToken.findMany({ where: { userId: pref.userId } });
    for (const { token } of tokens) {
      messages.push({
        token,
        title: content.title,
        body: content.body,
        data: { reminderId: pref.id, category: pref.category },
      });
    }
  }

  if (messages.length === 0) return 0;

  const result = await push.send(messages);

  // Prune tokens Expo reported as dead, so the list does not grow forever
  // with devices that uninstalled the app.
  if (result.invalidTokens.length > 0) {
    await prisma.pushToken.deleteMany({ where: { token: { in: result.invalidTokens } } });
  }

  deps.log?.('reminder tick sent notifications', {
    sent: result.sent,
    pruned: result.invalidTokens.length,
  });

  return result.sent;
}

/** How often the tick runs. Must be well under the grace window in due-reminders. */
const TICK_INTERVAL_MS = 60_000;

/**
 * Starts the recurring tick and returns a stop function.
 *
 * `unref()` keeps the timer from holding the process open, so a shutdown or a
 * test run is not blocked waiting for the next minute to elapse.
 */
export function startReminderScheduler(deps: SchedulerDeps): () => void {
  const timer = setInterval(() => {
    void runReminderTick(deps).catch((error) => {
      // A failed tick must never kill the process — the next one retries.
      deps.log?.('reminder tick failed', { error: String(error) });
    });
  }, TICK_INTERVAL_MS);

  timer.unref?.();
  return () => clearInterval(timer);
}
