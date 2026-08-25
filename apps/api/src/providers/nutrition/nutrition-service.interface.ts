import type { NutritionEstimate } from '@fitness-app/shared';

export interface NutritionLookupInput {
  name: string;
  quantity: number;
  unit: string;
  estimatedWeightGrams?: number;
  preparationMethod?: string;
}

export interface NutritionService {
  lookup(input: NutritionLookupInput): Promise<NutritionEstimate>;
}
