import type { Per100g } from './food-table';

export const FALLBACK_PER_100G: Per100g = { calories: 150, proteinG: 5, carbsG: 15, fatG: 6, fiberG: 1 };

/** Less/more-oily descriptors shift fat (and its calorie contribution) rather than inventing a new dish. */
export function applyPreparationAdjustment(per100g: Per100g, preparationMethod?: string): Per100g {
  if (preparationMethod === 'less_oily') {
    const fatDelta = per100g.fatG * 0.3;
    return { ...per100g, fatG: per100g.fatG - fatDelta, calories: per100g.calories - fatDelta * 9 };
  }
  if (preparationMethod === 'more_oily') {
    const fatDelta = per100g.fatG * 0.3;
    return { ...per100g, fatG: per100g.fatG + fatDelta, calories: per100g.calories + fatDelta * 9 };
  }
  return per100g;
}
