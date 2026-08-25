import type { Env } from '../../config/env';
import { MockNutritionProvider } from './mock-nutrition.provider';
import type { NutritionService } from './nutrition-service.interface';
import { UsdaNutritionProvider } from './usda.provider';

export function createNutritionService(env: Env): NutritionService {
  if (env.MOCK_NUTRITION || !env.NUTRITION_API_KEY) {
    return new MockNutritionProvider();
  }
  return new UsdaNutritionProvider(env.NUTRITION_API_KEY);
}
