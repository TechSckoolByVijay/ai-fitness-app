import { z } from 'zod';
import { InterpretedActivitySchema } from './exercise-interpret.schema';
import { FoodInterpretRequestSchema, InterpretedMealSchema } from './food-interpret.schema';

/** Same request shape as food-only interpretation — the fields were always generic (text/audio/nowISO), never food-specific. */
export const EventInterpretRequestSchema = FoodInterpretRequestSchema;
export type EventInterpretRequest = z.infer<typeof EventInterpretRequestSchema>;

export const InterpretedHealthEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('food'), meal: InterpretedMealSchema }),
  z.object({ type: z.literal('exercise'), activity: InterpretedActivitySchema }),
]);
export type InterpretedHealthEvent = z.infer<typeof InterpretedHealthEventSchema>;

export const EventInterpretResponseSchema = z.object({
  /** One utterance can describe multiple meals/activities (e.g. a whole day logged at once) — always an array, even for the common single-event case. */
  events: z.array(InterpretedHealthEventSchema).min(1),
});
export type EventInterpretResponse = z.infer<typeof EventInterpretResponseSchema>;
