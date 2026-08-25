import type {
  CreateFoodEntryRequest,
  FoodEntriesResponse,
  FoodEntryDto,
  UpdateFoodEntryRequest,
} from '@fitness-app/shared';
import { apiRequest } from './client';

export function createFoodEntry(input: CreateFoodEntryRequest) {
  return apiRequest<FoodEntryDto>('/food/entries', { method: 'POST', body: input });
}

export function listFoodEntries(params: { date?: string; page?: number } = {}) {
  const query = new URLSearchParams();
  if (params.date) query.set('date', params.date);
  if (params.page !== undefined) query.set('page', String(params.page));
  const qs = query.toString();
  return apiRequest<FoodEntriesResponse>(`/food/entries${qs ? `?${qs}` : ''}`);
}

export function updateFoodEntry(id: string, input: UpdateFoodEntryRequest) {
  return apiRequest<FoodEntryDto>(`/food/entries/${id}`, { method: 'PATCH', body: input });
}

export function deleteFoodEntry(id: string) {
  return apiRequest<void>(`/food/entries/${id}`, { method: 'DELETE' });
}
