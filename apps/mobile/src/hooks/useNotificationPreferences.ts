import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateNotificationPreferenceRequest,
  NotificationPreferencesResponse,
  UpdateNotificationPreferenceRequest,
} from '@fitness-app/shared';
import {
  createNotificationPreference,
  deleteNotificationPreference,
  getNotificationPreferences,
  updateNotificationPreference,
} from '../api/notifications.api';
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

/** Every mutation returns the whole list, so the cache is replaced rather than patched. */
function useReminderMutation<TInput>(mutationFn: (input: TInput) => Promise<NotificationPreferencesResponse>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data: NotificationPreferencesResponse) => {
      queryClient.setQueryData(queryKeys.notificationPreferences, data);
    },
  });
}

export function useCreateNotificationPreference() {
  return useReminderMutation((input: CreateNotificationPreferenceRequest) => createNotificationPreference(input));
}

export function useUpdateNotificationPreference() {
  return useReminderMutation(({ id, ...input }: UpdateNotificationPreferenceRequest & { id: string }) =>
    updateNotificationPreference(id, input),
  );
}

export function useDeleteNotificationPreference() {
  return useReminderMutation((id: string) => deleteNotificationPreference(id));
}
