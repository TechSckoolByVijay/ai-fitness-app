import type { DashboardToday } from '@fitness-app/shared';
import { apiRequest } from './client';

export function getTodayDashboard() {
  return apiRequest<DashboardToday>('/dashboard/today');
}
