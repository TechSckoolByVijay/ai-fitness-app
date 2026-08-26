import { z } from 'zod';
import { ConfidenceTierSchema, MealTypeSchema } from './enums.schema';
import { NutritionEstimateSchema } from './nutrition.schema';

export const InterpretedFoodItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  estimatedWeightGrams: z.number().positive().optional(),
  preparationMethod: z.string().optional(),
  ingredients: z.array(z.string()).optional(),
  descriptors: z.array(z.string()).optional(),
  /** 0-1 score from the extraction provider for this item */
  confidence: z.number().min(0).max(1),
  tier: ConfidenceTierSchema,
  nutrition: NutritionEstimateSchema,
});
export type InterpretedFoodItem = z.infer<typeof InterpretedFoodItemSchema>;

export const InterpretedMealSchema = z.object({
  mealType: MealTypeSchema,
  loggedAt: z.string().min(1),
  sourceText: z.string().optional(),
  items: z.array(InterpretedFoodItemSchema).min(1),
  /** worst-of across items */
  tier: ConfidenceTierSchema,
  /** true only when tier === 'high' and the user's auto-log setting is enabled */
  autoLog: z.boolean(),
  clarifyingQuestion: z.string().optional(),
  quickOptions: z.array(z.string()).optional(),
  estimatedTotals: NutritionEstimateSchema,
});
export type InterpretedMeal = z.infer<typeof InterpretedMealSchema>;

export const FoodInterpretRequestSchema = z
  .object({
    text: z.string().min(1).optional(),
    audioBase64: z.string().optional(),
    /** A photo of a meal or a nutrition label, as a base64-encoded data URL (e.g. "data:image/jpeg;base64,..."). */
    imageBase64: z.string().optional(),
    mockTranscriptId: z.string().optional(),
    nowISO: z.string().min(1),
  })
  .refine((d) => Boolean(d.text || d.audioBase64 || d.imageBase64 || d.mockTranscriptId), {
    message: 'One of text, audioBase64, imageBase64, or mockTranscriptId is required',
  });
export type FoodInterpretRequest = z.infer<typeof FoodInterpretRequestSchema>;

export const FoodInterpretResponseSchema = z.object({
  meal: InterpretedMealSchema,
});
export type FoodInterpretResponse = z.infer<typeof FoodInterpretResponseSchema>;
