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

const PROTEIN_STEP_G = 1;
/** Low-protein foods (tea, fruit) still need room to move: at least this wide. */
const MIN_PROTEIN_RANGE_G = 10;

/**
 * Protein bounds are wider than calorie bounds (0.5x-2x): the common
 * correction is "I added extra paneer", which can double protein while
 * barely moving the plate's calories.
 */
export function proteinSliderBounds(estimateProteinG: number): { min: number; max: number } {
  const min = Math.max(0, Math.round(estimateProteinG * 0.5));
  const max = Math.max(min + MIN_PROTEIN_RANGE_G, Math.round(estimateProteinG * 2));
  return { min, max };
}

export { PROTEIN_STEP_G };

/** Records the looked-up values the first time the user corrects anything. */
function withOriginals(nutrition: NutritionEstimate): NutritionEstimate {
  if (nutrition.estimatedCalories !== undefined) return nutrition;
  return { ...nutrition, estimatedCalories: nutrition.calories, estimatedProteinG: nutrition.proteinG };
}

/**
 * Rescales every macro to match a manually corrected calorie value, keeping
 * the AI's original macro *ratios* intact — the assumption being it got the
 * kind of food right (e.g. "mostly carbs and a little fat") even if it got
 * the absolute portion size wrong. Quantity/unit are deliberately left
 * untouched by the caller — this only ever changes the nutrition numbers.
 *
 * Protein the user has set by hand is the exception: it stays where they
 * put it.
 */
export function scaleNutritionToCalories(nutrition: NutritionEstimate, newCalories: number): NutritionEstimate {
  const base = withOriginals(nutrition);
  if (base.calories <= 0) {
    return { ...base, calories: round1(newCalories), isEstimate: true, source: 'user_edited' };
  }

  const scale = newCalories / base.calories;
  return {
    ...base,
    calories: round1(newCalories),
    proteinG: base.proteinSetByUser ? base.proteinG : round1(base.proteinG * scale),
    carbsG: round1(base.carbsG * scale),
    fatG: round1(base.fatG * scale),
    fiberG: base.fiberG !== undefined ? round1(base.fiberG * scale) : base.fiberG,
    sugarG: base.sugarG !== undefined ? round1(base.sugarG * scale) : undefined,
    sodiumMg: base.sodiumMg !== undefined ? round1(base.sodiumMg * scale) : undefined,
    isEstimate: true,
    source: 'user_edited',
  };
}

/** Sets protein directly, leaving calories and the other macros as they are. */
export function setNutritionProtein(nutrition: NutritionEstimate, proteinG: number): NutritionEstimate {
  return {
    ...withOriginals(nutrition),
    proteinG: round1(Math.max(0, proteinG)),
    proteinSetByUser: true,
    isEstimate: true,
    source: 'user_edited',
  };
}

/**
 * A quantity change genuinely changes everything, including a protein value
 * the user set and the original estimate (which was for the old quantity).
 */
export function scaleNutritionForQuantity(nutrition: NutritionEstimate, scale: number): NutritionEstimate {
  return {
    ...nutrition,
    calories: round1(nutrition.calories * scale),
    proteinG: round1(nutrition.proteinG * scale),
    carbsG: round1(nutrition.carbsG * scale),
    fatG: round1(nutrition.fatG * scale),
    fiberG: round1((nutrition.fiberG ?? 0) * scale),
    sugarG: nutrition.sugarG !== undefined ? round1(nutrition.sugarG * scale) : undefined,
    sodiumMg: nutrition.sodiumMg !== undefined ? round1(nutrition.sodiumMg * scale) : undefined,
    estimatedCalories:
      nutrition.estimatedCalories !== undefined ? round1(nutrition.estimatedCalories * scale) : undefined,
    estimatedProteinG:
      nutrition.estimatedProteinG !== undefined ? round1(nutrition.estimatedProteinG * scale) : undefined,
  };
}
