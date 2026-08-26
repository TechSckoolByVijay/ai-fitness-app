import { useQuery } from '@tanstack/react-query';
import { getTodayInsights } from '../api/insights.api';
import { queryKeys } from '../api/queryKeys';
import { useAuthStore } from '../state/authStore';

export function useInsights() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: queryKeys.insightsToday,
    queryFn: getTodayInsights,
    enabled: status === 'authenticated',
  });
}
