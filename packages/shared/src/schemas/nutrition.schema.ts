import { z } from 'zod';
import { NutritionSourceSchema } from './enums.schema';

export const NutritionEstimateSchema = z.object({
  calories: z.number().nonnegative(),
  proteinG: z.number().nonnegative(),
  carbsG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
  fiberG: z.number().nonnegative().default(0),
  sugarG: z.number().nonnegative().optional(),
  sodiumMg: z.number().nonnegative().optional(),
  isEstimate: z.boolean().default(true),
  source: NutritionSourceSchema,
  /**
   * The looked-up values before the user corrected anything, captured on
   * the first edit and absent until then. Kept so export can show
   * "estimated vs what you said" and so estimate accuracy is measurable.
   */
  estimatedCalories: z.number().nonnegative().optional(),
  estimatedProteinG: z.number().nonnegative().optional(),
  /**
   * The user set protein directly. From then on a calorie correction leaves
   * protein alone instead of rescaling it with the other macros.
   */
  proteinSetByUser: z.boolean().optional(),
});
export type NutritionEstimate = z.infer<typeof NutritionEstimateSchema>;

export function sumNutrition(items: NutritionEstimate[]): NutritionEstimate {
  return items.reduce<NutritionEstimate>(
    (total, item) => ({
      calories: total.calories + item.calories,
      proteinG: total.proteinG + item.proteinG,
      carbsG: total.carbsG + item.carbsG,
      fatG: total.fatG + item.fatG,
      fiberG: (total.fiberG ?? 0) + (item.fiberG ?? 0),
      sugarG: (total.sugarG ?? 0) + (item.sugarG ?? 0),
      sodiumMg: (total.sodiumMg ?? 0) + (item.sodiumMg ?? 0),
      isEstimate: total.isEstimate || item.isEstimate,
      source: total.source,
    }),
    {
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
      sugarG: 0,
      sodiumMg: 0,
      isEstimate: true,
      source: items[0]?.source ?? 'mock',
    },
  );
}
