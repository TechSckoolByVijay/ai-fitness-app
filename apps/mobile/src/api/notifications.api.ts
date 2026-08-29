import type {
  CreateNotificationPreferenceRequest,
  RegisterPushTokenRequest,
  NotificationPreferencesResponse,
  UpdateNotificationPreferenceRequest,
} from '@fitness-app/shared';
import { apiRequest } from './client';

export function getNotificationPreferences() {
  return apiRequest<NotificationPreferencesResponse>('/me/notification-preferences');
}

export function createNotificationPreference(input: CreateNotificationPreferenceRequest) {
  return apiRequest<NotificationPreferencesResponse>('/me/notification-preferences', {
    method: 'POST',
    body: input,
  });
}

// Reminders are addressed by row id, not category — a user can hold several
// reminders of the same category, so the category no longer identifies one.
export function updateNotificationPreference(id: string, input: UpdateNotificationPreferenceRequest) {
  return apiRequest<NotificationPreferencesResponse>(`/me/notification-preferences/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export function deleteNotificationPreference(id: string) {
  return apiRequest<NotificationPreferencesResponse>(`/me/notification-preferences/${id}`, {
    method: 'DELETE',
  });
}

export function registerPushToken(input: RegisterPushTokenRequest) {
  return apiRequest<void>('/me/push-tokens', { method: 'POST', body: input });
}
