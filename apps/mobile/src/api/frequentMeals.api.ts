import type { FrequentMealsResponse } from '@fitness-app/shared';
import { apiRequest } from './client';

export function listFrequentMeals() {
  return apiRequest<FrequentMealsResponse>('/frequent-meals');
}
