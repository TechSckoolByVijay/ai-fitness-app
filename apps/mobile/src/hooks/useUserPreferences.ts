import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpsertUserPreferenceRequest, UserPreferencesResponse } from '@fitness-app/shared';
import {
  deleteUserPreference,
  getUserPreferences,
  upsertUserPreference,
} from '../api/preferences.api';
import { queryKeys } from '../api/queryKeys';
import { useAuthStore } from '../state/authStore';

export function useUserPreferences() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: queryKeys.userPreferences,
    queryFn: getUserPreferences,
    enabled: status === 'authenticated',
  });
}

/** Every mutation returns the whole list, so the cache is replaced rather than patched. */
function usePreferenceMutation<TInput>(fn: (input: TInput) => Promise<UserPreferencesResponse>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.userPreferences, data);
      // Preferences change how future entries are calculated, so anything
      // already on screen derived from the old values is now stale.
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardToday });
    },
  });
}

export function useUpsertUserPreference() {
  return usePreferenceMutation((input: UpsertUserPreferenceRequest) => upsertUserPreference(input));
}

export function useDeleteUserPreference() {
  return usePreferenceMutation((id: string) => deleteUserPreference(id));
}
