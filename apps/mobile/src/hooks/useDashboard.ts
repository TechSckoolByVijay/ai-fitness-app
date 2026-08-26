import { useQuery } from '@tanstack/react-query';
import { getDashboardHistory, getTodayDashboard } from '../api/dashboard.api';
import { queryKeys } from '../api/queryKeys';
import { useAuthStore } from '../state/authStore';

export function useDashboard() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: queryKeys.dashboardToday,
    queryFn: getTodayDashboard,
    enabled: status === 'authenticated',
  });
}

export function useDashboardHistory(days = 14) {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: queryKeys.dashboardHistory(days),
    queryFn: () => getDashboardHistory(days),
    enabled: status === 'authenticated',
  });
}
