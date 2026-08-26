import type { DashboardHistory, DashboardToday } from '@fitness-app/shared';
import { apiRequest } from './client';

export function getTodayDashboard() {
  return apiRequest<DashboardToday>('/dashboard/today');
}

export function getDashboardHistory(days: number) {
  return apiRequest<DashboardHistory>(`/dashboard/history?days=${days}`);
}
