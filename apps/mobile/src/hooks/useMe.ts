import { useQuery } from '@tanstack/react-query';
import { getMe } from '../api/users.api';
import { queryKeys } from '../api/queryKeys';
import { useAuthStore } from '../state/authStore';

export function useMe() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: getMe,
    enabled: status === 'authenticated',
  });
}
