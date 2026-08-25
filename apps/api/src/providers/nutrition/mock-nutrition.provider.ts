import type { NutritionEstimate } from '@fitness-app/shared';
import { findFoodEntry, type FoodTableEntry, type Per100g } from './food-table';
import type { NutritionLookupInput, NutritionService } from './nutrition-service.interface';

const FALLBACK_PER_100G: Per100g = { calories: 150, proteinG: 5, carbsG: 15, fatG: 6, fiberG: 1 };

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function resolveGrams(
  entry: FoodTableEntry | undefined,
  quantity: number,
  unit: string,
  estimatedWeightGrams?: number,
): number {
  if (estimatedWeightGrams) return estimatedWeightGrams;

  const normalizedUnit = unit.toLowerCase();
  if (['g', 'gram', 'grams'].includes(normalizedUnit)) return quantity;
  if (normalizedUnit === 'kg') return quantity * 1000;

  if (entry) {
    const perUnit = entry.gramsPerUnit[normalizedUnit] ?? entry.gramsPerUnit[entry.defaultUnit] ?? 100;
    return perUnit * quantity;
  }

  return quantity * 100;
}

/** Less/more-oily descriptors shift fat (and its calorie contribution) rather than inventing a new dish. */
function applyPreparationAdjustment(per100g: Per100g, preparationMethod?: string): Per100g {
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

export class MockNutritionProvider implements NutritionService {
  async lookup(input: NutritionLookupInput): Promise<NutritionEstimate> {
    const entry = findFoodEntry(input.name);
    const per100g = applyPreparationAdjustment(entry?.per100g ?? FALLBACK_PER_100G, input.preparationMethod);
    const grams = resolveGrams(entry, input.quantity, input.unit, input.estimatedWeightGrams);
    const scale = grams / 100;

    return {
      calories: round1(per100g.calories * scale),
      proteinG: round1(per100g.proteinG * scale),
      carbsG: round1(per100g.carbsG * scale),
      fatG: round1(per100g.fatG * scale),
      fiberG: round1((per100g.fiberG ?? 0) * scale),
      sugarG: per100g.sugarG !== undefined ? round1(per100g.sugarG * scale) : undefined,
      sodiumMg: per100g.sodiumMg !== undefined ? round1(per100g.sodiumMg * scale) : undefined,
      isEstimate: true,
      source: 'mock',
    };
  }
}
