import type { NutritionEstimate } from '@fitness-app/shared';

export interface NutritionLookupInput {
  name: string;
  quantity: number;
  unit: string;
  estimatedWeightGrams?: number;
  preparationMethod?: string;
  /** This user's own unit weights, which outrank the standard tables. */
  unitWeightOverrides?: Record<string, number>;
}

export interface NutritionService {
  lookup(input: NutritionLookupInput): Promise<NutritionEstimate>;
}
