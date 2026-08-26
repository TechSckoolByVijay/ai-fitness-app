import { useQuery } from '@tanstack/react-query';
import { listFrequentMeals } from '../api/frequentMeals.api';
import { queryKeys } from '../api/queryKeys';
import { useAuthStore } from '../state/authStore';

export function useFrequentMeals() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: queryKeys.frequentMeals,
    queryFn: listFrequentMeals,
    enabled: status === 'authenticated',
  });
}
