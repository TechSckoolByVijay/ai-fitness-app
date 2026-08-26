import type {
  DeleteAccountRequest,
  MeResponse,
  UpdateAllergiesRequest,
  UpdateDietRequest,
  UpdateGoalsRequest,
  UpdateHealthConditionsRequest,
  UpdateProfileRequest,
} from '@fitness-app/shared';
import { apiRequest } from './client';

export function getMe() {
  return apiRequest<MeResponse>('/me');
}

export function updateProfile(input: UpdateProfileRequest) {
  return apiRequest<MeResponse>('/me/profile', { method: 'PATCH', body: input });
}

export function updateGoals(input: UpdateGoalsRequest) {
  return apiRequest<MeResponse>('/me/goals', { method: 'PATCH', body: input });
}

export function updateDiet(input: UpdateDietRequest) {
  return apiRequest<MeResponse>('/me/diet', { method: 'PATCH', body: input });
}

export function updateAllergies(input: UpdateAllergiesRequest) {
  return apiRequest<MeResponse>('/me/allergies', { method: 'PATCH', body: input });
}

export function updateHealthConditions(input: UpdateHealthConditionsRequest) {
  return apiRequest<MeResponse>('/me/health-conditions', { method: 'PATCH', body: input });
}

export function completeOnboarding() {
  return apiRequest<MeResponse>('/me/onboarding/complete', { method: 'POST' });
}

export function deleteAccount(input: DeleteAccountRequest) {
  return apiRequest<void>('/me', { method: 'DELETE', body: input });
}
