import type { CreateExerciseEntryRequest, ExerciseEntryDto } from '@fitness-app/shared';
import { apiRequest } from './client';

export function createExerciseEntry(input: CreateExerciseEntryRequest) {
  return apiRequest<ExerciseEntryDto>('/exercise/entries', { method: 'POST', body: input });
}
