import type { PrismaClient } from '@prisma/client';
import type {
  NotificationCategory,
  NotificationPreferenceDto,
  NotificationPreferencesResponse,
  UpdateNotificationPreferenceRequest,
} from '@fitness-app/shared';

const ALL_CATEGORIES: NotificationCategory[] = [
  'water',
  'sleep',
  'screen_break',
  'meal_suggestion',
  'goal_progress',
  'weekly_summary',
  'health_insight',
];

/** Categories default to enabled with no preferred time until the user explicitly customizes them — no row needs to exist yet. */
export async function getNotificationPreferences(
  prisma: PrismaClient,
  userId: string,
): Promise<NotificationPreferencesResponse> {
  const stored = await prisma.notificationPreference.findMany({ where: { userId } });
  const byCategory = new Map(stored.map((pref) => [pref.category, pref]));

  const preferences: NotificationPreferenceDto[] = ALL_CATEGORIES.map((category) => {
    const existing = byCategory.get(category);
    return {
      category,
      enabled: existing?.enabled ?? true,
      preferredTime: existing?.preferredTime ?? null,
    };
  });

  return { preferences };
}

export async function updateNotificationPreference(
  prisma: PrismaClient,
  userId: string,
  input: UpdateNotificationPreferenceRequest,
): Promise<NotificationPreferencesResponse> {
  await prisma.notificationPreference.upsert({
    where: { userId_category: { userId, category: input.category } },
    update: { enabled: input.enabled, preferredTime: input.preferredTime ?? null },
    create: {
      userId,
      category: input.category,
      enabled: input.enabled,
      preferredTime: input.preferredTime ?? null,
    },
  });

  return getNotificationPreferences(prisma, userId);
}
