import type { HealthDay } from '@fitness-app/shared';
import { Platform } from 'react-native';

/**
 * Android Health Connect access.
 *
 * Health Connect is an ON-DEVICE API — the server cannot read it. So the app
 * reads here and posts the result to /health/sync.
 *
 * The native module is loaded through a guarded require rather than a static
 * import on purpose: it only exists in a dev/production build with the
 * config plugin, and a static import would break the bundle in Expo Go
 * before any of this code ran. Everything below degrades to "unavailable"
 * instead, so the rest of the app is unaffected.
 */

interface HealthConnectModule {
  initialize: () => Promise<boolean>;
  requestPermission: (permissions: { accessType: string; recordType: string }[]) => Promise<unknown[]>;
  readRecords: (
    recordType: string,
    options: { timeRangeFilter: { operator: string; startTime: string; endTime: string } },
  ) => Promise<{ records: Record<string, unknown>[] }>;
  getSdkStatus: () => Promise<number>;
}

const REQUIRED_PERMISSIONS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'SleepSession' },
];

function loadModule(): HealthConnectModule | null {
  if (Platform.OS !== 'android') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-health-connect') as HealthConnectModule;
  } catch {
    return null;
  }
}

/** Whether this build can talk to Health Connect at all. */
export function isHealthConnectSupported(): boolean {
  return loadModule() !== null;
}

export async function requestHealthPermissions(): Promise<boolean> {
  const module = loadModule();
  if (!module) return false;
  try {
    const ready = await module.initialize();
    if (!ready) return false;
    const granted = await module.requestPermission(REQUIRED_PERMISSIONS);
    return Array.isArray(granted) && granted.length > 0;
  } catch {
    return false;
  }
}

function dayBounds(date: Date): { startTime: string; endTime: string } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { startTime: start.toISOString(), endTime: end.toISOString() };
}

function toLocalDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function sumField(records: Record<string, unknown>[], pick: (r: Record<string, unknown>) => number | null): number | null {
  let total = 0;
  let found = false;
  for (const record of records) {
    const value = pick(record);
    if (value != null && Number.isFinite(value)) {
      total += value;
      found = true;
    }
  }
  return found ? total : null;
}

async function readDay(module: HealthConnectModule, date: Date): Promise<HealthDay> {
  const timeRangeFilter = { operator: 'between', ...dayBounds(date) };

  const read = async (recordType: string) => {
    try {
      const result = await module.readRecords(recordType, { timeRangeFilter });
      return result?.records ?? [];
    } catch {
      // A single unavailable record type must not fail the whole day —
      // partial data is more useful than none.
      return [];
    }
  };

  const [steps, distance, active, sleep] = await Promise.all([
    read('Steps'),
    read('Distance'),
    read('ActiveCaloriesBurned'),
    read('SleepSession'),
  ]);

  return {
    date: toLocalDateString(date),
    steps: sumField(steps, (r) => (typeof r.count === 'number' ? r.count : null)),
    distanceMeters: sumField(distance, (r) => {
      const d = r.distance as { inMeters?: number } | undefined;
      return typeof d?.inMeters === 'number' ? d.inMeters : null;
    }),
    activeCalories: sumField(active, (r) => {
      const e = r.energy as { inKilocalories?: number } | undefined;
      return typeof e?.inKilocalories === 'number' ? e.inKilocalories : null;
    }),
    sleepMinutes: sumField(sleep, (r) => {
      if (typeof r.startTime !== 'string' || typeof r.endTime !== 'string') return null;
      const minutes = (Date.parse(r.endTime) - Date.parse(r.startTime)) / 60000;
      return Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : null;
    }),
  };
}

/**
 * Reads the last `days` days, newest first.
 *
 * A window rather than just today, because a phone that was offline or an app
 * that was not opened for a while should backfill on the next sync rather
 * than leaving permanent gaps.
 */
export async function readRecentHealthDays(days = 7): Promise<HealthDay[]> {
  const module = loadModule();
  if (!module) return [];

  const results: HealthDay[] = [];
  for (let offset = 0; offset < days; offset++) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    results.push(await readDay(module, date));
  }

  // Days where the device recorded nothing at all carry no information and
  // would just overwrite good data with nulls.
  return results.filter(
    (d) => d.steps != null || d.distanceMeters != null || d.activeCalories != null || d.sleepMinutes != null,
  );
}
