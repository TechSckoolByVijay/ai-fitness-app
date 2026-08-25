import { z } from 'zod';
import { ExerciseExtractionEventObjectSchema } from './exercise-event.schema';
import { FoodExtractionEventSchema } from './food-event.schema';

/**
 * General AI-extraction contract: a single utterance can describe a food
 * event OR an exercise event (spec section 16 — "Voice Beyond Food": the
 * microphone becomes a universal health-logging interface, not just food).
 * Adding a new event type later (water/sleep/weight) means adding another
 * member here, not redesigning the pipeline.
 */
export const HealthEventSchema = z.discriminatedUnion('type', [
  FoodExtractionEventSchema,
  ExerciseExtractionEventObjectSchema,
]);
export type HealthEvent = z.infer<typeof HealthEventSchema>;

export const HealthExtractionResultSchema = z.object({
  events: z.array(HealthEventSchema).min(1),
});
export type HealthExtractionResult = z.infer<typeof HealthExtractionResultSchema>;
