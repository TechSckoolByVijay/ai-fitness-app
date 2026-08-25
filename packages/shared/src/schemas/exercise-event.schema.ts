import { z } from 'zod';

export const ActivityTypeSchema = z.enum([
  'walking',
  'running',
  'cycling',
  'swimming',
  'yoga',
  'badminton',
  'tennis',
  'football',
  'basketball',
  'cricket',
  'gym_workout',
  'weight_training',
  'dancing',
  'hiking',
  'other',
]);
export type ActivityType = z.infer<typeof ActivityTypeSchema>;

export const IntensitySchema = z.enum(['light', 'moderate', 'vigorous']);
export type Intensity = z.infer<typeof IntensitySchema>;

/**
 * The contract every AIProvider.extractFoodEvents() implementation must
 * return for an activity mention (spec section 16 — "Voice Beyond Food").
 * The AI only identifies WHAT was done; calorie burn is always computed
 * deterministically downstream (spec principle #6), never by the model.
 *
 * Plain object (no .refine()) so it can be used as a z.discriminatedUnion()
 * member alongside FoodExtractionEventSchema — the "at least one of
 * duration/steps/distance" invariant is enforced by the refined variant
 * below for standalone validation.
 */
export const ExerciseExtractionEventObjectSchema = z.object({
  type: z.literal('exercise'),
  timestamp: z.string().min(1),
  activityType: ActivityTypeSchema,
  durationMinutes: z.number().positive().optional(),
  steps: z.number().positive().optional(),
  distanceKm: z.number().positive().optional(),
  intensity: IntensitySchema.optional(),
  confidence: z.number().min(0).max(1),
  descriptors: z.array(z.string()).optional(),
});

export const ExerciseExtractionEventSchema = ExerciseExtractionEventObjectSchema.refine(
  (event) => event.durationMinutes !== undefined || event.steps !== undefined || event.distanceKm !== undefined,
  { message: 'At least one of durationMinutes, steps, or distanceKm is required' },
);
export type ExerciseExtractionEvent = z.infer<typeof ExerciseExtractionEventObjectSchema>;
