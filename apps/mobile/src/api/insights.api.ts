import type { InsightsResponse } from '@fitness-app/shared';
import { apiRequest } from './client';

export function getTodayInsights() {
  return apiRequest<InsightsResponse>('/insights/today');
}
