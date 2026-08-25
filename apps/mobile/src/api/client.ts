import Constants from 'expo-constants';
import { getAccessToken, getRefreshToken, useAuthStore } from '../state/authStore';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

/** Concurrent 401s from multiple in-flight requests all await the same refresh call rather than each firing their own. */
function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return null;

      try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!response.ok) return null;

        const data = (await response.json()) as { accessToken: string; refreshToken: string };
        await useAuthStore.getState().updateTokens(data.accessToken, data.refreshToken);
        return data.accessToken;
      } catch {
        return null;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  // Fastify's default JSON body parser rejects a `Content-Type: application/json`
  // header on a request with no body (FST_ERR_CTP_EMPTY_JSON_BODY) — only set
  // it when we're actually sending a JSON body.
  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth) {
    const token = await getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Network request failed. Check your connection and try again.', 0, 'NETWORK_ERROR');
  }

  // Access token expired or invalid — try one silent refresh-and-retry. If
  // that also fails, the session is genuinely dead: clear it so the
  // auth-gated route layouts redirect to login, instead of the app getting
  // stuck retrying against a permanently-401ing endpoint forever.
  if (response.status === 401 && auth && !isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiRequest<T>(path, options, true);
    }
    await useAuthStore.getState().clearSession();
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    throw new ApiError(data?.message ?? 'Something went wrong', response.status, data?.error);
  }

  return data as T;
}
