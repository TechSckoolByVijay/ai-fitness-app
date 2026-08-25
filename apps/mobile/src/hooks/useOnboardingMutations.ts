import type {
  UpdateAllergiesRequest,
  UpdateDietRequest,
  UpdateGoalsRequest,
  UpdateHealthConditionsRequest,
  UpdateProfileRequest,
} from '@fitness-app/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  completeOnboarding,
  updateAllergies,
  updateDiet,
  updateGoals,
  updateHealthConditions,
  updateProfile,
} from '../api/users.api';
import { queryKeys } from '../api/queryKeys';

function useInvalidateMe() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.me });
}

export function useUpdateProfile() {
  const invalidate = useInvalidateMe();
  return useMutation({
    mutationFn: (input: UpdateProfileRequest) => updateProfile(input),
    onSuccess: invalidate,
  });
}

export function useUpdateGoals() {
  const invalidate = useInvalidateMe();
  return useMutation({
    mutationFn: (input: UpdateGoalsRequest) => updateGoals(input),
    onSuccess: invalidate,
  });
}

export function useUpdateDiet() {
  const invalidate = useInvalidateMe();
  return useMutation({
    mutationFn: (input: UpdateDietRequest) => updateDiet(input),
    onSuccess: invalidate,
  });
}

export function useUpdateAllergies() {
  const invalidate = useInvalidateMe();
  return useMutation({
    mutationFn: (input: UpdateAllergiesRequest) => updateAllergies(input),
    onSuccess: invalidate,
  });
}

export function useUpdateHealthConditions() {
  const invalidate = useInvalidateMe();
  return useMutation({
    mutationFn: (input: UpdateHealthConditionsRequest) => updateHealthConditions(input),
    onSuccess: invalidate,
  });
}

export function useCompleteOnboarding() {
  const invalidate = useInvalidateMe();
  return useMutation({
    mutationFn: () => completeOnboarding(),
    onSuccess: invalidate,
  });
}
