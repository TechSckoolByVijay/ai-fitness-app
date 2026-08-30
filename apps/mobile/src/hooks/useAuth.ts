import type { DeleteAccountRequest, LoginRequest, RegisterRequest } from '@fitness-app/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  googleSignIn as googleSignInRequest,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from '../api/auth.api';
import { signInWithGoogle } from '../lib/googleSignIn';
import { deleteAccount as deleteAccountRequest } from '../api/users.api';
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

/**
 * Runs the native Google flow, then exchanges the ID token for a session.
 *
 * Resolves to null when the user backs out of the account picker — a
 * cancellation is not an error and must not surface as one.
 */
export function useGoogleSignIn() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const idToken = await signInWithGoogle();
      if (!idToken) return null;
      return googleSignInRequest({ idToken });
    },
    onSuccess: async (data) => {
      if (!data) return;
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

export function useDeleteAccount() {
  const clearSession = useAuthStore((s) => s.clearSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteAccountRequest) => deleteAccountRequest(input),
    onSuccess: async () => {
      await clearSession();
      queryClient.clear();
    },
  });
}
