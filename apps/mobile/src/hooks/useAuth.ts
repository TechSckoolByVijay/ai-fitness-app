import type { LoginRequest, RegisterRequest } from '@fitness-app/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { login as loginRequest, logout as logoutRequest, register as registerRequest } from '../api/auth.api';
import { getRefreshToken, useAuthStore } from '../state/authStore';

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LoginRequest) => loginRequest(input),
    onSuccess: async (data) => {
      await setSession(data.user, data.accessToken, data.refreshToken);
      await queryClient.invalidateQueries();
    },
  });
}

export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RegisterRequest) => registerRequest(input),
    onSuccess: async (data) => {
      await setSession(data.user, data.accessToken, data.refreshToken);
      await queryClient.invalidateQueries();
    },
  });
}

export function useLogout() {
  const clearSession = useAuthStore((s) => s.clearSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await logoutRequest(refreshToken).catch(() => undefined);
      }
    },
    onSuccess: async () => {
      await clearSession();
      queryClient.clear();
    },
  });
}
