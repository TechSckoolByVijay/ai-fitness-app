import type { ActivityLevel, GoalType, Sex } from '@fitness-app/shared';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_CALORIE_ADJUSTMENT: Partial<Record<GoalType, number>> = {
  lose_weight: -500,
  gain_muscle: 300,
};

const MIN_SAFE_CALORIES = 1200;

export interface CalorieTargetInput {
  sex: Sex | null;
  dateOfBirth: Date | null;
  heightCm: number | null;
  currentWeightKg: number | null;
  activityLevel: ActivityLevel | null;
  primaryGoal: GoalType | null;
}

export interface CalorieTargets {
  calorieTarget: number;
  proteinTarget: number;
  waterTargetMl: number;
}

/**
 * Mifflin-St Jeor BMR -> TDEE -> goal-adjusted calorie target, with a
 * conservative floor (spec section 10's "health recommendations must be
 * conservative and safety-aware"). Returns null when there isn't enough
 * body-metric data yet (progressive profiling may still be incomplete).
 */
export function calculateTargets(input: CalorieTargetInput): CalorieTargets | null {
  const { sex, dateOfBirth, heightCm, currentWeightKg, activityLevel, primaryGoal } = input;
  if (!heightCm || !currentWeightKg || !dateOfBirth) {
    return null;
  }

  const ageYears = Math.floor(
    (Date.now() - dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
  );
  // Male-formula offset used as the conservative default for 'other'/'prefer_not_to_say'.
  const sexOffset = sex === 'female' ? -161 : 5;
  const bmr = 10 * currentWeightKg + 6.25 * heightCm - 5 * ageYears + sexOffset;
  const tdee = bmr * (activityLevel ? ACTIVITY_MULTIPLIERS[activityLevel] : ACTIVITY_MULTIPLIERS.sedentary);
  const adjustment = primaryGoal ? (GOAL_CALORIE_ADJUSTMENT[primaryGoal] ?? 0) : 0;

  const calorieTarget = Math.round(Math.max(MIN_SAFE_CALORIES, tdee + adjustment));
  const proteinTarget = Math.round(currentWeightKg * (primaryGoal === 'gain_muscle' ? 1.8 : 1.2));
  const waterTargetMl = Math.round(currentWeightKg * 35);

  return { calorieTarget, proteinTarget, waterTargetMl };
}
