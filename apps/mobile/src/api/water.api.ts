import type { CreateWaterEntryRequest, WaterEntriesResponse, WaterEntryDto } from '@fitness-app/shared';
import { apiRequest } from './client';

export function createWaterEntry(input: CreateWaterEntryRequest) {
  return apiRequest<WaterEntryDto>('/water/entries', { method: 'POST', body: input });
}

export function listWaterEntries(params: { date?: string } = {}) {
  const query = new URLSearchParams();
  if (params.date) query.set('date', params.date);
  const qs = query.toString();
  return apiRequest<WaterEntriesResponse>(`/water/entries${qs ? `?${qs}` : ''}`);
}

export function deleteWaterEntry(id: string) {
  return apiRequest<void>(`/water/entries/${id}`, { method: 'DELETE' });
}
