import type { CreateWeightEntryRequest, WeightEntriesResponse, WeightEntryDto } from '@fitness-app/shared';
import { apiRequest } from './client';

export function createWeightEntry(input: CreateWeightEntryRequest) {
  return apiRequest<WeightEntryDto>('/weight/entries', { method: 'POST', body: input });
}

export function listWeightEntries() {
  return apiRequest<WeightEntriesResponse>('/weight/entries');
}

export function deleteWeightEntry(id: string) {
  return apiRequest<void>(`/weight/entries/${id}`, { method: 'DELETE' });
}
