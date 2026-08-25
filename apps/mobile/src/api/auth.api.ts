import type { AuthResponse, LoginRequest, RegisterRequest } from '@fitness-app/shared';
import { apiRequest } from './client';

export function register(input: RegisterRequest) {
  return apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: input, auth: false });
}

export function login(input: LoginRequest) {
  return apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: input, auth: false });
}

export function logout(refreshToken: string) {
  return apiRequest<void>('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false });
}
