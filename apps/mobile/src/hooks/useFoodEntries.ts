import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateFoodEntryRequest, UpdateFoodEntryRequest } from '@fitness-app/shared';
import { createFoodEntry, deleteFoodEntry, listFoodEntries, updateFoodEntry } from '../api/food.api';
import { queryKeys } from '../api/queryKeys';
import { useAuthStore } from '../state/authStore';

export function useFoodEntries(date?: string) {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: queryKeys.foodEntries(date),
    queryFn: () => listFoodEntries({ date }),
    enabled: status === 'authenticated',
  });
}

function useInvalidateFoodQueries() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardToday });
    queryClient.invalidateQueries({ queryKey: ['food', 'entries'] });
  };
}

export function useCreateFoodEntry() {
  const invalidate = useInvalidateFoodQueries();
  return useMutation({
    mutationFn: (input: CreateFoodEntryRequest) => createFoodEntry(input),
    onSuccess: invalidate,
  });
}

export function useUpdateFoodEntry() {
  const invalidate = useInvalidateFoodQueries();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFoodEntryRequest }) => updateFoodEntry(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteFoodEntry() {
  const invalidate = useInvalidateFoodQueries();
  return useMutation({
    mutationFn: (id: string) => deleteFoodEntry(id),
    onSuccess: invalidate,
  });
}
