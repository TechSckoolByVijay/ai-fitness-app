import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateWaterEntryRequest } from '@fitness-app/shared';
import { createWaterEntry, deleteWaterEntry, listWaterEntries } from '../api/water.api';
import { queryKeys } from '../api/queryKeys';
import { useAuthStore } from '../state/authStore';

export function useWaterEntries(date?: string) {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: queryKeys.waterEntries(date),
    queryFn: () => listWaterEntries({ date }),
    enabled: status === 'authenticated',
  });
}

function useInvalidateWaterQueries() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardToday });
    queryClient.invalidateQueries({ queryKey: ['water', 'entries'] });
  };
}

export function useCreateWaterEntry() {
  const invalidate = useInvalidateWaterQueries();
  return useMutation({
    mutationFn: (input: CreateWaterEntryRequest) => createWaterEntry(input),
    onSuccess: invalidate,
  });
}

export function useDeleteWaterEntry() {
  const invalidate = useInvalidateWaterQueries();
  return useMutation({
    mutationFn: (id: string) => deleteWaterEntry(id),
    onSuccess: invalidate,
  });
}
