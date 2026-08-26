import type { NotificationPreferencesResponse, UpdateNotificationPreferenceRequest } from '@fitness-app/shared';
import { apiRequest } from './client';

export function getNotificationPreferences() {
  return apiRequest<NotificationPreferencesResponse>('/me/notification-preferences');
}

export function updateNotificationPreference(input: UpdateNotificationPreferenceRequest) {
  return apiRequest<NotificationPreferencesResponse>('/me/notification-preferences', {
    method: 'PATCH',
    body: input,
  });
}
