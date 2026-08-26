import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateWeightEntryRequest } from '@fitness-app/shared';
import { createWeightEntry, deleteWeightEntry, listWeightEntries } from '../api/weight.api';
import { queryKeys } from '../api/queryKeys';
import { useAuthStore } from '../state/authStore';

export function useWeightEntries() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: queryKeys.weightEntries,
    queryFn: listWeightEntries,
    enabled: status === 'authenticated',
  });
}

function useInvalidateWeightQueries() {
  const queryClient = useQueryClient();
  return () => {
    // A new weight entry can update Profile.currentWeightKg and recompute
    // calorie/protein/water targets — refresh /me alongside the entry list.
    queryClient.invalidateQueries({ queryKey: queryKeys.me });
    queryClient.invalidateQueries({ queryKey: queryKeys.weightEntries });
  };
}

export function useCreateWeightEntry() {
  const invalidate = useInvalidateWeightQueries();
  return useMutation({
    mutationFn: (input: CreateWeightEntryRequest) => createWeightEntry(input),
    onSuccess: invalidate,
  });
}

export function useDeleteWeightEntry() {
  const invalidate = useInvalidateWeightQueries();
  return useMutation({
    mutationFn: (id: string) => deleteWeightEntry(id),
    onSuccess: invalidate,
  });
}
