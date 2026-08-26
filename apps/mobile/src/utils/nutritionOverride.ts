import type { NutritionEstimate } from '@fitness-app/shared';

const STEP_KCAL = 5;

function roundToStep(value: number): number {
  return Math.round(value / STEP_KCAL) * STEP_KCAL;
}

/**
 * A slider needs bounds relative to the AI's own estimate, not a fixed
 * absolute range — a banana and a curry serving don't share a sensible
 * calorie ceiling. Deliberately narrow (0.6x-1.5x): this is for nudging a
 * plausibly-off estimate, not for entering an arbitrary number. A user who
 * wants something wildly different (e.g. 3 chapatis' worth instead of 2)
 * should change the quantity instead — the slider isn't a substitute for
 * that, and a wide range makes small, deliberate corrections unusably
 * coarse to drag.
 *
 * min floors at 0, not some fixed positive amount — a genuinely ~0-calorie
 * item (plain water) needs to be able to actually reach 0, not get stuck
 * with an artificial floor. `max` still guarantees a minimum usable width
 * even when the estimate itself is 0.
 */
export function calorieSliderBounds(estimateCalories: number): { min: number; max: number } {
  const min = Math.max(0, roundToStep(estimateCalories * 0.6));
  const max = Math.max(min + STEP_KCAL * 4, roundToStep(estimateCalories * 1.5));
  return { min, max };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Rescales every macro to match a manually corrected calorie value, keeping
 * the AI's original macro *ratios* intact — the assumption being it got the
 * kind of food right (e.g. "mostly carbs and a little fat") even if it got
 * the absolute portion size wrong. Quantity/unit are deliberately left
 * untouched by the caller — this only ever changes the nutrition numbers.
 */
export function scaleNutritionToCalories(nutrition: NutritionEstimate, newCalories: number): NutritionEstimate {
  if (nutrition.calories <= 0) {
    return { ...nutrition, calories: round1(newCalories), isEstimate: true, source: 'user_edited' };
  }

  const scale = newCalories / nutrition.calories;
  return {
    ...nutrition,
    calories: round1(newCalories),
    proteinG: round1(nutrition.proteinG * scale),
    carbsG: round1(nutrition.carbsG * scale),
    fatG: round1(nutrition.fatG * scale),
    fiberG: nutrition.fiberG !== undefined ? round1(nutrition.fiberG * scale) : nutrition.fiberG,
    sugarG: nutrition.sugarG !== undefined ? round1(nutrition.sugarG * scale) : undefined,
    sodiumMg: nutrition.sodiumMg !== undefined ? round1(nutrition.sodiumMg * scale) : undefined,
    isEstimate: true,
    source: 'user_edited',
  };
}
