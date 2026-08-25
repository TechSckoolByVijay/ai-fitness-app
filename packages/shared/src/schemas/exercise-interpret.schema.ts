import { z } from 'zod';
import { ActivityTypeSchema, IntensitySchema } from './exercise-event.schema';
import { ConfidenceTierSchema } from './enums.schema';

/**
 * The interpreted (post-calorie-calculation) shape returned to the client.
 * durationMinutes is always present here even if the user only gave steps —
 * steps are converted to an estimated duration deterministically before this
 * is built (see apps/api's calorie-burn module). caloriesBurned is always
 * computed by that same deterministic engine, never trusted from the AI.
 */
export const InterpretedActivitySchema = z.object({
  activityType: ActivityTypeSchema,
  loggedAt: z.string().min(1),
  sourceText: z.string().optional(),
  durationMinutes: z.number().positive(),
  steps: z.number().positive().optional(),
  distanceKm: z.number().positive().optional(),
  intensity: IntensitySchema.optional(),
  caloriesBurned: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
  tier: ConfidenceTierSchema,
  autoLog: z.boolean(),
});
export type InterpretedActivity = z.infer<typeof InterpretedActivitySchema>;
