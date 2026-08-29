import type { NotificationPreference, PrismaClient } from '@prisma/client';
import type {
  CreateNotificationPreferenceRequest,
  NotificationCategory,
  NotificationPreferenceDto,
  NotificationPreferencesResponse,
  UpdateNotificationPreferenceRequest,
} from '@fitness-app/shared';
import { NotFoundError, ValidationError } from '../../lib/errors';

/**
 * The reminders every user gets by default. These are the only categories
 * with notification copy actually wired up on the client; the rest of
 * NotificationCategory exists for later phases.
 *
 * Seeded per user (at registration, and by a backfill migration for existing
 * users) rather than created lazily on first edit, because the API addresses
 * reminders by row id — which requires the row to exist. Seeding on read
 * would mean a GET that writes.
 */
export const BUILT_IN_REMINDERS: { category: NotificationCategory; defaultTime: string }[] = [
  { category: 'water', defaultTime: '11:00' },
  { category: 'sleep', defaultTime: '22:00' },
  { category: 'goal_progress', defaultTime: '20:00' },
];

const BUILT_IN_CATEGORIES = new Set<NotificationCategory>(BUILT_IN_REMINDERS.map((r) => r.category));

/** A row is built-in exactly when it has no user-supplied label. */
function isBuiltIn(row: Pick<NotificationPreference, 'label'>): boolean {
  return row.label === null;
}

function toDto(row: NotificationPreference): NotificationPreferenceDto {
  return {
    id: row.id,
    category: row.category,
    label: row.label,
    isBuiltIn: isBuiltIn(row),
    enabled: row.enabled,
    preferredTime: row.preferredTime,
  };
}

/** Idempotent — safe to call for a user who already has some of these. */
export async function seedBuiltInReminders(prisma: PrismaClient, userId: string): Promise<void> {
  await prisma.notificationPreference.createMany({
    data: BUILT_IN_REMINDERS.map((reminder) => ({
      userId,
      category: reminder.category,
      label: null,
      enabled: true,
      preferredTime: reminder.defaultTime,
    })),
    skipDuplicates: true,
  });
}

export async function getNotificationPreferences(
  prisma: PrismaClient,
  userId: string,
): Promise<NotificationPreferencesResponse> {
  const rows = await prisma.notificationPreference.findMany({
    where: { userId },
    // Built-ins first (label nulls first), then the user's own in the order
    // they were added, so the list never reshuffles under them as times change.
    orderBy: [{ label: 'asc' }, { createdAt: 'asc' }],
  });

  return { preferences: rows.map(toDto) };
}

/** Loads a row and proves it belongs to this user — never trust an id from the client. */
async function findOwned(prisma: PrismaClient, userId: string, id: string): Promise<NotificationPreference> {
  const row = await prisma.notificationPreference.findFirst({ where: { id, userId } });
  if (!row) throw new NotFoundError('Reminder not found');
  return row;
}

export async function createNotificationPreference(
  prisma: PrismaClient,
  userId: string,
  input: CreateNotificationPreferenceRequest,
): Promise<NotificationPreferencesResponse> {
  await prisma.notificationPreference.create({
    data: {
      userId,
      category: input.category,
      // Always non-null here: a created reminder is by definition user-added,
      // and the label is what keeps it out of the built-in unique index.
      label: input.label,
      enabled: input.enabled,
      preferredTime: input.preferredTime,
    },
  });

  return getNotificationPreferences(prisma, userId);
}

export async function updateNotificationPreference(
  prisma: PrismaClient,
  userId: string,
  id: string,
  input: UpdateNotificationPreferenceRequest,
): Promise<NotificationPreferencesResponse> {
  const existing = await findOwned(prisma, userId, id);

  // Renaming a built-in would give it a label, which would silently promote it
  // to a user-added reminder and free its slot in the partial unique index.
  if (input.label !== undefined && isBuiltIn(existing)) {
    throw new ValidationError('Built-in reminders cannot be renamed');
  }

  await prisma.notificationPreference.update({
    where: { id },
    data: {
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.preferredTime !== undefined ? { preferredTime: input.preferredTime } : {}),
      ...(input.label !== undefined ? { label: input.label } : {}),
    },
  });

  return getNotificationPreferences(prisma, userId);
}

export async function deleteNotificationPreference(
  prisma: PrismaClient,
  userId: string,
  id: string,
): Promise<NotificationPreferencesResponse> {
  const existing = await findOwned(prisma, userId, id);

  // Built-ins are disabled, never removed — otherwise a user can end up with an
  // app that has permanently lost its water reminder and no way to get it back.
  if (isBuiltIn(existing)) {
    throw new ValidationError('Built-in reminders can be turned off, but not deleted');
  }

  await prisma.notificationPreference.delete({ where: { id } });
  return getNotificationPreferences(prisma, userId);
}

export { BUILT_IN_CATEGORIES };
