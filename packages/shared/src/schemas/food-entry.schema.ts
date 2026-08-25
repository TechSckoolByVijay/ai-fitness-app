import { z } from 'zod';
import { ConfidenceTierSchema, FoodEntryStatusSchema, MealTypeSchema } from './enums.schema';
import { NutritionEstimateSchema } from './nutrition.schema';

export const FoodItemInputSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  estimatedWeightGrams: z.number().positive().optional(),
  preparationMethod: z.string().optional(),
  ingredients: z.array(z.string()).optional(),
  descriptors: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).default(1),
  nutrition: NutritionEstimateSchema,
});
export type FoodItemInput = z.infer<typeof FoodItemInputSchema>;

export const CreateFoodEntryRequestSchema = z.object({
  mealType: MealTypeSchema,
  loggedAt: z.string().min(1),
  sourceText: z.string().optional(),
  confidenceTier: ConfidenceTierSchema.optional(),
  items: z.array(FoodItemInputSchema).min(1),
});
export type CreateFoodEntryRequest = z.infer<typeof CreateFoodEntryRequestSchema>;

export const UpdateFoodEntryRequestSchema = z.object({
  mealType: MealTypeSchema.optional(),
  loggedAt: z.string().min(1).optional(),
  items: z.array(FoodItemInputSchema).min(1).optional(),
});
export type UpdateFoodEntryRequest = z.infer<typeof UpdateFoodEntryRequestSchema>;

export const FoodItemDtoSchema = FoodItemInputSchema.extend({
  id: z.string().uuid(),
});
export type FoodItemDto = z.infer<typeof FoodItemDtoSchema>;

export const FoodEntryDtoSchema = z.object({
  id: z.string().uuid(),
  mealType: MealTypeSchema,
  loggedAt: z.string(),
  sourceText: z.string().nullable(),
  confidenceTier: ConfidenceTierSchema,
  status: FoodEntryStatusSchema,
  items: z.array(FoodItemDtoSchema),
  totals: NutritionEstimateSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type FoodEntryDto = z.infer<typeof FoodEntryDtoSchema>;

export const FoodEntriesResponseSchema = z.object({
  entries: z.array(FoodEntryDtoSchema),
  pagination: z.object({
    page: z.number().int().nonnegative(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  }),
});
export type FoodEntriesResponse = z.infer<typeof FoodEntriesResponseSchema>;
