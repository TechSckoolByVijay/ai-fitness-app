import type { NutritionEstimate } from '@fitness-app/shared';
import { findFoodEntry, type FoodTableEntry } from './food-table';
import { applyPreparationAdjustment, FALLBACK_PER_100G } from './nutrition-adjustments';
import type { NutritionLookupInput, NutritionService } from './nutrition-service.interface';

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
