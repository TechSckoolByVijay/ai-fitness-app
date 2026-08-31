import type { PrismaClient } from '@prisma/client';
import type {
  UpsertUserPreferenceRequest,
  UserPreferenceDto,
  UserPreferencesResponse,
} from '@fitness-app/shared';

/**
 * What one user's overrides look like once loaded, in the shape the
 * calculations actually want: plain maps, so a lookup is a property access
 * rather than a search.
 */
export interface UserOverrides {
  /** Unit word (lower-cased) -> grams. */
  unitWeights: Record<string, number>;
  /** ActivityType (or "default") -> multiplier on calories burned. */
  activityIntensity: Record<string, number>;
}

export const NO_OVERRIDES: UserOverrides = { unitWeights: {}, activityIntensity: {} };

/** Keys are matched case-insensitively — nobody should have to remember how they typed it. */
function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

export async function loadUserOverrides(prisma: PrismaClient, userId: string): Promise<UserOverrides> {
  const rows = await prisma.userPreference.findMany({ where: { userId } });

  const overrides: UserOverrides = { unitWeights: {}, activityIntensity: {} };
  for (const row of rows) {
    const value = row.valueJson as Record<string, unknown> | null;
    if (row.kind === 'unit_weight' && typeof value?.grams === 'number') {
      overrides.unitWeights[row.key] = value.grams;
    } else if (row.kind === 'activity_intensity' && typeof value?.multiplier === 'number') {
      overrides.activityIntensity[row.key] = value.multiplier;
    }
  }
  return overrides;
}

function toDto(row: {
  id: string;
  kind: string;
  key: string;
  valueJson: unknown;
}): UserPreferenceDto {
  const value = row.valueJson as Record<string, unknown> | null;
  return {
    id: row.id,
    kind: row.kind as UserPreferenceDto['kind'],
    key: row.key,
    grams: typeof value?.grams === 'number' ? value.grams : null,
    multiplier: typeof value?.multiplier === 'number' ? value.multiplier : null,
  };
}

export async function listUserPreferences(
  prisma: PrismaClient,
  userId: string,
): Promise<UserPreferencesResponse> {
  const rows = await prisma.userPreference.findMany({
    where: { userId },
    orderBy: [{ kind: 'asc' }, { key: 'asc' }],
  });
  return { preferences: rows.map(toDto) };
}

/**
 * Sets or replaces one preference.
 *
 * Upsert rather than insert: telling the app your scoop is 35g twice should
 * leave one answer, not two conflicting ones.
 */
export async function upsertUserPreference(
  prisma: PrismaClient,
  userId: string,
  input: UpsertUserPreferenceRequest,
): Promise<UserPreferencesResponse> {
  const key = normalizeKey(input.key);
  const valueJson = input.kind === 'unit_weight' ? { grams: input.grams } : { multiplier: input.multiplier };

  await prisma.userPreference.upsert({
    where: { userId_kind_key: { userId, kind: input.kind, key } },
    update: { valueJson },
    create: { userId, kind: input.kind, key, valueJson },
  });

  return listUserPreferences(prisma, userId);
}

/**
 * Removes a preference, returning the user to the standard tables.
 *
 * Scoped to the user's own rows: a preference is only ever theirs, and an id
 * from a client is never trusted.
 */
export async function deleteUserPreference(
  prisma: PrismaClient,
  userId: string,
  id: string,
): Promise<UserPreferencesResponse> {
  await prisma.userPreference.deleteMany({ where: { id, userId } });
  return listUserPreferences(prisma, userId);
}
