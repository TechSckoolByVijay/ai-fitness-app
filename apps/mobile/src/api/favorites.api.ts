import type {
  CreateFavoriteFoodRequest,
  FavoriteFoodsResponse,
  FavoriteFoodDto,
  FoodEntryDto,
  LogFavoriteFoodRequest,
} from '@fitness-app/shared';
import { apiRequest } from './client';

export function createFavoriteFood(input: CreateFavoriteFoodRequest) {
  return apiRequest<FavoriteFoodDto>('/favorites', { method: 'POST', body: input });
}

export function listFavoriteFoods() {
  return apiRequest<FavoriteFoodsResponse>('/favorites');
}

export function deleteFavoriteFood(id: string) {
  return apiRequest<void>(`/favorites/${id}`, { method: 'DELETE' });
}

export function logFavoriteFood(id: string, input: LogFavoriteFoodRequest = {}) {
  return apiRequest<FoodEntryDto>(`/favorites/${id}/log`, { method: 'POST', body: input });
}
