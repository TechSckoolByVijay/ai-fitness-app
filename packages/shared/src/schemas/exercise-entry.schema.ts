import { z } from 'zod';
import { ActivityTypeSchema, IntensitySchema } from './exercise-event.schema';

export const CreateExerciseEntryRequestSchema = z.object({
  activityType: ActivityTypeSchema,
  loggedAt: z.string().min(1),
  sourceText: z.string().optional(),
  durationMinutes: z.number().positive(),
  steps: z.number().positive().optional(),
  distanceKm: z.number().positive().optional(),
  intensity: IntensitySchema.optional(),
  caloriesBurned: z.number().nonnegative(),
  confidence: z.number().min(0).max(1).default(1),
});
export type CreateExerciseEntryRequest = z.infer<typeof CreateExerciseEntryRequestSchema>;

export const ExerciseEntryDtoSchema = CreateExerciseEntryRequestSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string(),
});
export type ExerciseEntryDto = z.infer<typeof ExerciseEntryDtoSchema>;

export const ExerciseEntriesResponseSchema = z.object({
  entries: z.array(ExerciseEntryDtoSchema),
  pagination: z.object({
    page: z.number().int().nonnegative(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  }),
});
export type ExerciseEntriesResponse = z.infer<typeof ExerciseEntriesResponseSchema>;
