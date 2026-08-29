import type { UnitSystem } from '@fitness-app/shared';
import { useMe } from './useMe';

/**
 * The user's display preference for weights and heights.
 *
 * Defaults to metric while the profile is still loading, which matches the
 * server-side column default — so a screen never briefly renders imperial
 * numbers for a metric user and then swaps them under them.
 */
export function useUnitSystem(): UnitSystem {
  const me = useMe();
  return me.data?.profile.unitSystem ?? 'metric';
}
