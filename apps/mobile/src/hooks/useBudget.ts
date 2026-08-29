import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MeResponse, UpdateBudgetRequest } from '@fitness-app/shared';
import { updateBudget } from '../api/users.api';
import { queryKeys } from '../api/queryKeys';

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBudgetRequest) => updateBudget(input),
    onSuccess: (data: MeResponse) => {
      queryClient.setQueryData(queryKeys.me, data);
      // Calorie and protein targets drive the dashboard, so it is now stale.
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardToday });
    },
  });
}
