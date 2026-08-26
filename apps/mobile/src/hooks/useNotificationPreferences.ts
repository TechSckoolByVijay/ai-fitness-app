import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotificationPreferencesResponse, UpdateNotificationPreferenceRequest } from '@fitness-app/shared';
import { getNotificationPreferences, updateNotificationPreference } from '../api/notifications.api';
import { queryKeys } from '../api/queryKeys';
import { useAuthStore } from '../state/authStore';

export function useNotificationPreferences() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: queryKeys.notificationPreferences,
    queryFn: getNotificationPreferences,
    enabled: status === 'authenticated',
  });
}

export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateNotificationPreferenceRequest) => updateNotificationPreference(input),
    onSuccess: (data: NotificationPreferencesResponse) => {
      queryClient.setQueryData(queryKeys.notificationPreferences, data);
    },
  });
}
