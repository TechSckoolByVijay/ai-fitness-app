import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateExerciseEntryRequest } from '@fitness-app/shared';
import { createExerciseEntry } from '../api/exercise.api';
import { queryKeys } from '../api/queryKeys';

export function useCreateExerciseEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExerciseEntryRequest) => createExerciseEntry(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardToday });
      queryClient.invalidateQueries({ queryKey: queryKeys.exerciseEntries() });
    },
  });
}
