import { z } from 'zod';
import { MealTypeSchema } from './enums.schema';

/**
 * The contract every AIProvider.extractFoodEvents() implementation must return
 * (spec section 34). Both mock and real providers are validated against this
 * schema before their output is trusted anywhere downstream — never parse
 * raw LLM/mock text.
 */
export const FoodItemExtractionSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  estimatedWeightGrams: z.number().positive().optional(),
  preparationMethod: z.string().optional(),
  ingredients: z.array(z.string()).optional(),
  spiceLevel: z.enum(['mild', 'medium', 'spicy']).optional(),
  /** 0-1 score reported by the extraction provider for this single item */
  confidence: z.number().min(0).max(1),
  /** free-text descriptors the user used ("less oily", "medium spicy", ...) */
  descriptors: z.array(z.string()).optional(),
});
export type FoodItemExtraction = z.infer<typeof FoodItemExtractionSchema>;

export const FoodExtractionEventSchema = z.object({
  type: z.literal('food'),
  timestamp: z.string().min(1),
  mealType: MealTypeSchema.optional(),
  items: z.array(FoodItemExtractionSchema).min(1),
});
export type FoodExtractionEvent = z.infer<typeof FoodExtractionEventSchema>;

export const FoodExtractionResultSchema = z.object({
  events: z.array(FoodExtractionEventSchema).min(1),
});
export type FoodExtractionResult = z.infer<typeof FoodExtractionResultSchema>;
