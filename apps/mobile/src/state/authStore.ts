import { create } from 'zustand';
import { secureStorage } from './secureStorage';

const ACCESS_TOKEN_KEY = 'fitness_app.accessToken';
const REFRESH_TOKEN_KEY = 'fitness_app.refreshToken';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  profilePhotoUrl: string | null;
}

interface AuthState {
  status: 'loading' | 'authenticated' | 'unauthenticated';
  user: AuthUser | null;
  accessToken: string | null;
  hydrate: () => Promise<void>;
  setSession: (user: AuthUser, accessToken: string, refreshToken: string) => Promise<void>;
  updateTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  clearSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,
  accessToken: null,

  hydrate: async () => {
    const [accessToken, refreshToken] = await Promise.all([
      secureStorage.getItemAsync(ACCESS_TOKEN_KEY),
      secureStorage.getItemAsync(REFRESH_TOKEN_KEY),
    ]);
    if (accessToken && refreshToken) {
      set({ accessToken, status: 'authenticated' });
    } else {
      set({ status: 'unauthenticated' });
    }
  },

  setSession: async (user, accessToken, refreshToken) => {
    await Promise.all([
      secureStorage.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
      secureStorage.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
    ]);
    set({ user, accessToken, status: 'authenticated' });
  },

  /** Silent-refresh path — updates tokens without touching `user` (the refresh endpoint doesn't return one). */
  updateTokens: async (accessToken, refreshToken) => {
    await Promise.all([
      secureStorage.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
      secureStorage.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
    ]);
    set({ accessToken, status: 'authenticated' });
  },

  clearSession: async () => {
    await Promise.all([
      secureStorage.deleteItemAsync(ACCESS_TOKEN_KEY),
      secureStorage.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
    set({ user: null, accessToken: null, status: 'unauthenticated' });
  },
}));

/** Plain async accessor (not a hook) for use outside React components, e.g. the fetch client. */
export async function getAccessToken(): Promise<string | null> {
  const inMemory = useAuthStore.getState().accessToken;
  if (inMemory) return inMemory;
  return secureStorage.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return secureStorage.getItemAsync(REFRESH_TOKEN_KEY);
}
