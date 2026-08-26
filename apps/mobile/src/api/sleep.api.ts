import type { CreateSleepEntryRequest, SleepEntriesResponse, SleepEntryDto } from '@fitness-app/shared';
import { apiRequest } from './client';

export function createSleepEntry(input: CreateSleepEntryRequest) {
  return apiRequest<SleepEntryDto>('/sleep/entries', { method: 'POST', body: input });
}

export function listSleepEntries() {
  return apiRequest<SleepEntriesResponse>('/sleep/entries');
}

export function deleteSleepEntry(id: string) {
  return apiRequest<void>(`/sleep/entries/${id}`, { method: 'DELETE' });
}
