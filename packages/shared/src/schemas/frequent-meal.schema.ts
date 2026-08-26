import { z } from 'zod';
import { MealTypeSchema } from './enums.schema';
import { FoodItemInputSchema } from './food-entry.schema';

export const FrequentMealDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  mealType: MealTypeSchema,
  items: z.array(FoodItemInputSchema),
  useCount: z.number().int().nonnegative(),
  lastUsedAt: z.string().nullable(),
});
export type FrequentMealDto = z.infer<typeof FrequentMealDtoSchema>;

export const FrequentMealsResponseSchema = z.object({
  frequentMeals: z.array(FrequentMealDtoSchema),
});
export type FrequentMealsResponse = z.infer<typeof FrequentMealsResponseSchema>;
