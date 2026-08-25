import { useQuery } from '@tanstack/react-query';
import { getTodayDashboard } from '../api/dashboard.api';
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
