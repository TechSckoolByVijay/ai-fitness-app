import { z } from 'zod';
import { MealTypeSchema } from './enums.schema';
import { FoodItemInputSchema } from './food-entry.schema';

export const CreateFavoriteFoodRequestSchema = z.object({
  name: z.string().min(1).max(80),
  mealType: MealTypeSchema,
  items: z.array(FoodItemInputSchema).min(1),
});
export type CreateFavoriteFoodRequest = z.infer<typeof CreateFavoriteFoodRequestSchema>;

export const FavoriteFoodDtoSchema = CreateFavoriteFoodRequestSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string(),
});
export type FavoriteFoodDto = z.infer<typeof FavoriteFoodDtoSchema>;

export const FavoriteFoodsResponseSchema = z.object({
  favorites: z.array(FavoriteFoodDtoSchema),
});
export type FavoriteFoodsResponse = z.infer<typeof FavoriteFoodsResponseSchema>;

/** loggedAt defaults to "now" server-side when omitted — logging a favorite is meant to be a single tap. */
export const LogFavoriteFoodRequestSchema = z.object({
  loggedAt: z.string().min(1).optional(),
});
export type LogFavoriteFoodRequest = z.infer<typeof LogFavoriteFoodRequestSchema>;
