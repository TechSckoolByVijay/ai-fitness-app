import type { ActivityType, Intensity } from '@fitness-app/shared';

interface MetTable {
  light: number;
  moderate: number;
  vigorous: number;
}

/**
 * Standard MET (Metabolic Equivalent of Task) values from the Compendium of
 * Physical Activities — the same reference figures fitness trackers use.
 * Deterministic lookup, not model-generated.
 */
const MET_TABLE: Record<ActivityType, MetTable> = {
  walking: { light: 2.8, moderate: 3.5, vigorous: 5.0 },
  running: { light: 6.0, moderate: 8.3, vigorous: 11.0 },
  cycling: { light: 4.0, moderate: 6.8, vigorous: 10.0 },
  swimming: { light: 4.5, moderate: 6.0, vigorous: 9.8 },
  yoga: { light: 2.0, moderate: 2.5, vigorous: 4.0 },
  badminton: { light: 4.5, moderate: 5.5, vigorous: 7.0 },
  tennis: { light: 5.0, moderate: 7.3, vigorous: 8.0 },
  football: { light: 5.0, moderate: 7.0, vigorous: 10.0 },
  basketball: { light: 4.5, moderate: 6.5, vigorous: 8.0 },
  cricket: { light: 4.0, moderate: 5.0, vigorous: 6.0 },
  gym_workout: { light: 3.0, moderate: 5.0, vigorous: 6.0 },
  weight_training: { light: 3.0, moderate: 5.0, vigorous: 6.0 },
  dancing: { light: 3.0, moderate: 4.5, vigorous: 6.5 },
  hiking: { light: 4.0, moderate: 6.0, vigorous: 7.8 },
  other: { light: 3.0, moderate: 4.0, vigorous: 6.0 },
};

/** Average speed assumption used only to convert a bare distance into a duration when no time/steps was given. */
const AVERAGE_SPEED_KMH: Record<ActivityType, number> = {
  walking: 5,
  running: 9,
  cycling: 18,
  swimming: 2,
  yoga: 1,
  badminton: 3,
  tennis: 3,
  football: 6,
  basketball: 6,
  cricket: 3,
  gym_workout: 3,
  weight_training: 2,
  dancing: 3,
  hiking: 4,
  other: 4,
};

/** ~100 steps/minute is a commonly cited average adult walking cadence. */
const STEPS_PER_MINUTE_WALKING = 100;
const DEFAULT_INTENSITY: Intensity = 'moderate';
const MIN_DURATION_MINUTES = 1;

/** Conservative fallback when the user hasn't set a weight in onboarding yet — never block a log on missing data. */
export const DEFAULT_WEIGHT_KG = 70;

export interface CalorieBurnInput {
  activityType: ActivityType;
  durationMinutes?: number;
  steps?: number;
  distanceKm?: number;
  intensity?: Intensity;
  weightKg: number;
  /**
   * How hard this user actually trains, relative to the MET tables. Those
   * tables are a population average; someone who lifts heavy for an hour and
   * someone who strolls through the same hour both log "gym".
   */
  intensityMultiplier?: number;
}

export interface CalorieBurnResult {
  durationMinutes: number;
  caloriesBurned: number;
  metUsed: number;
}

function resolveDurationMinutes(input: CalorieBurnInput): number {
  if (input.durationMinutes !== undefined) {
    return input.durationMinutes;
  }
  if (input.steps !== undefined) {
    return input.steps / STEPS_PER_MINUTE_WALKING;
  }
  if (input.distanceKm !== undefined) {
    const speedKmh = AVERAGE_SPEED_KMH[input.activityType] ?? AVERAGE_SPEED_KMH.other;
    return (input.distanceKm / speedKmh) * 60;
  }
  return MIN_DURATION_MINUTES;
}

/**
 * Standard MET-based calorie burn formula: calories = MET x weight(kg) x
 * duration(hours). Deterministic and provider-agnostic — the AI provider's
 * job stops at identifying activityType/duration/steps/distance; this
 * function is the sole source of the calorie number (spec principle #6
 * extended to activity, per explicit user requirement: never let an LLM
 * compute the calorie burn itself).
 */
export function calculateCaloriesBurned(input: CalorieBurnInput): CalorieBurnResult {
  const durationMinutes = Math.max(MIN_DURATION_MINUTES, resolveDurationMinutes(input));
  const intensity = input.intensity ?? DEFAULT_INTENSITY;
  const metTable = MET_TABLE[input.activityType] ?? MET_TABLE.other;
  const met = metTable[intensity];

  const durationHours = durationMinutes / 60;
  // Clamped so a bad multiplier cannot make the number absurd — the same
  // reasoning as the weight cap in resolve-grams.
  const multiplier = Math.min(Math.max(input.intensityMultiplier ?? 1, 0.5), 2);
  const caloriesBurned = met * input.weightKg * durationHours * multiplier;

  return {
    durationMinutes: Math.round(durationMinutes * 10) / 10,
    caloriesBurned: Math.round(caloriesBurned * 10) / 10,
    metUsed: met,
  };
}
