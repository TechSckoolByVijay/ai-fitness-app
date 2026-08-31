import type { NutritionEstimate } from '@fitness-app/shared';
import { findFoodEntry } from './food-table';
import { resolveGrams } from './resolve-grams';
import { applyPreparationAdjustment, FALLBACK_PER_100G } from './nutrition-adjustments';
import type { NutritionLookupInput, NutritionService } from './nutrition-service.interface';

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}


export class MockNutritionProvider implements NutritionService {
  async lookup(input: NutritionLookupInput): Promise<NutritionEstimate> {
    const entry = findFoodEntry(input.name);
    const per100g = applyPreparationAdjustment(entry?.per100g ?? FALLBACK_PER_100G, input.preparationMethod);
    const grams = resolveGrams(entry, input.quantity, input.unit, input.estimatedWeightGrams, input.unitWeightOverrides);
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
