import type { UpsertUserPreferenceRequest, UserPreferencesResponse } from '@fitness-app/shared';
import { apiRequest } from './client';

export function getUserPreferences() {
  return apiRequest<UserPreferencesResponse>('/me/preferences');
}

export function upsertUserPreference(input: UpsertUserPreferenceRequest) {
  return apiRequest<UserPreferencesResponse>('/me/preferences', { method: 'PUT', body: input });
}

export function deleteUserPreference(id: string) {
  return apiRequest<UserPreferencesResponse>(`/me/preferences/${id}`, { method: 'DELETE' });
}
