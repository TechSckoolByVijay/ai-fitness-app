import type { PrismaClient } from '@prisma/client';
import type {
  HealthConnectionResponse,
  SyncHealthDataRequest,
} from '@fitness-app/shared';

const PROVIDER_MAP = {
  health_connect: 'health_connect',
  apple_health: 'apple_health',
} as const;

/**
 * Stores a batch of device-read health data.
 *
 * Two destinations, deliberately:
 *
 * - `HealthMetric` gets everything, tagged with its source. This is the
 *   record of what the device actually reported.
 * - `DailySummary` mirrors ONLY steps and distance, because those are the
 *   fields the daily aggregation pass does not own. It recomputes
 *   `activeCalories` and `sleepDurationMin` from the user's logged exercise
 *   and sleep entries, so writing device values there would work until the
 *   next food log silently wiped them.
 *
 * Device sleep and active calories therefore live in HealthMetric only, and
 * the user's own logged entries stay authoritative on the dashboard. Merging
 * the two is a real product decision, not something to do implicitly here.
 */
export async function syncHealthData(
  prisma: PrismaClient,
  userId: string,
  input: SyncHealthDataRequest,
): Promise<{ daysStored: number }> {
  const source = PROVIDER_MAP[input.provider];

  for (const day of input.days) {
    const date = new Date(`${day.date}T00:00:00.000Z`);

    const metrics: { type: string; value: number }[] = [];
    if (day.steps != null) metrics.push({ type: 'steps', value: day.steps });
    if (day.distanceMeters != null) metrics.push({ type: 'distance_m', value: day.distanceMeters });
    if (day.activeCalories != null) metrics.push({ type: 'active_calories', value: day.activeCalories });
    if (day.sleepMinutes != null) metrics.push({ type: 'sleep_minutes', value: day.sleepMinutes });
    if (day.restingHeartRate != null) metrics.push({ type: 'resting_hr', value: day.restingHeartRate });

    for (const metric of metrics) {
      // Re-syncing the same day is normal (a device backfills as it catches
      // up), so replace that day's value rather than appending a duplicate.
      await prisma.healthMetric.deleteMany({
        where: { userId, type: metric.type, recordedAt: date, source },
      });
      await prisma.healthMetric.create({
        data: { userId, type: metric.type, valueJson: { value: metric.value }, recordedAt: date, source },
      });
    }

    if (day.steps != null || day.distanceMeters != null) {
      await prisma.dailySummary.upsert({
        where: { userId_date: { userId, date } },
        update: {
          ...(day.steps != null ? { steps: day.steps } : {}),
          ...(day.distanceMeters != null ? { distanceM: day.distanceMeters } : {}),
        },
        create: {
          userId,
          date,
          steps: day.steps ?? null,
          distanceM: day.distanceMeters ?? null,
        },
      });
    }
  }

  await prisma.healthIntegration.upsert({
    where: { userId_provider: { userId, provider: source } },
    update: { status: 'connected' },
    create: { userId, provider: source, status: 'connected', connectedAt: new Date() },
  });

  return { daysStored: input.days.length };
}

export async function getHealthConnections(
  prisma: PrismaClient,
  userId: string,
): Promise<HealthConnectionResponse> {
  const integrations = await prisma.healthIntegration.findMany({ where: { userId } });

  return {
    connections: integrations
      .filter((i) => i.provider === 'health_connect' || i.provider === 'apple_health')
      .map((i) => ({
        provider: i.provider as 'health_connect' | 'apple_health',
        status: i.status === 'connected' ? ('connected' as const) : i.status === 'error' ? ('error' as const) : ('disconnected' as const),
        connectedAt: i.connectedAt?.toISOString() ?? null,
        // updatedAt moves on every sync, so it is the honest "last synced".
        lastSyncedAt: i.status === 'connected' ? i.updatedAt.toISOString() : null,
      })),
  };
}

export async function disconnectHealthProvider(
  prisma: PrismaClient,
  userId: string,
  provider: 'health_connect' | 'apple_health',
): Promise<void> {
  await prisma.healthIntegration.updateMany({
    where: { userId, provider },
    data: { status: 'disconnected' },
  });
}
