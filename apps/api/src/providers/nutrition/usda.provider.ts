import type { NutritionEstimate } from '@fitness-app/shared';
import type { NutritionLookupInput, NutritionService } from './nutrition-service.interface';

/** Real provider stub — not implemented in Phase 1 (no NUTRITION_API_KEY available). */
export class UsdaNutritionProvider implements NutritionService {
  constructor(private readonly apiKey: string) {}

  async lookup(_input: NutritionLookupInput): Promise<NutritionEstimate> {
    throw new Error(
      'UsdaNutritionProvider is not implemented yet. Set MOCK_NUTRITION=true or implement lookup() against USDA FoodData Central.',
    );
  }
}
