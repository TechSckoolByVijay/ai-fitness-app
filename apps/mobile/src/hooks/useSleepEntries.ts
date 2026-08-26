import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateSleepEntryRequest } from '@fitness-app/shared';
import { createSleepEntry, deleteSleepEntry, listSleepEntries } from '../api/sleep.api';
import { queryKeys } from '../api/queryKeys';
import { useAuthStore } from '../state/authStore';

export function useSleepEntries() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: queryKeys.sleepEntries,
    queryFn: listSleepEntries,
    enabled: status === 'authenticated',
  });
}

function useInvalidateSleepQueries() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardToday });
    queryClient.invalidateQueries({ queryKey: queryKeys.sleepEntries });
  };
}

export function useCreateSleepEntry() {
  const invalidate = useInvalidateSleepQueries();
  return useMutation({
    mutationFn: (input: CreateSleepEntryRequest) => createSleepEntry(input),
    onSuccess: invalidate,
  });
}

export function useDeleteSleepEntry() {
  const invalidate = useInvalidateSleepQueries();
  return useMutation({
    mutationFn: (id: string) => deleteSleepEntry(id),
    onSuccess: invalidate,
  });
}
