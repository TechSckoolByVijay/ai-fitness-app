import type { GoalType } from '../schemas/enums.schema';

export type CalorieAlignment = 'favorable' | 'unfavorable' | 'neutral';

const TOLERANCE_FRACTION = 0.05;

/**
 * "Good" calorie direction depends on the goal — a deficit is progress for
 * weight loss but a setback for muscle gain. Shared between the backend's
 * yesterday-focused insight cards and the mobile app's live intraday
 * pacing indicator, so both apply the exact same goal-aware judgment
 * instead of two implementations that could quietly drift apart.
 */
export function classifyCalorieAlignment(
  goalType: GoalType | null,
  consumedCalories: number,
  referenceCalories: number,
): CalorieAlignment {
  const diff = consumedCalories - referenceCalories;
  const tolerance = referenceCalories * TOLERANCE_FRACTION;

  if (goalType === 'lose_weight') {
    if (diff < -tolerance) return 'favorable';
    if (diff > tolerance) return 'unfavorable';
    return 'neutral';
  }

  if (goalType === 'gain_muscle') {
    if (diff > tolerance) return 'favorable';
    if (diff < -tolerance) return 'unfavorable';
    return 'neutral';
  }

  // maintain_weight and the non-calorie-direction goals (improve_fitness,
  // improve_health, improve_sleep, healthier_eating): staying close to the
  // reference is the favorable outcome, in either direction.
  return Math.abs(diff) <= tolerance ? 'favorable' : 'neutral';
}
