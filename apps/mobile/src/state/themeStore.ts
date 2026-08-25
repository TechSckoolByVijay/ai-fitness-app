import { colorScheme } from 'nativewind';
import { create } from 'zustand';
import { secureStorage } from './secureStorage';

export type ThemePreference = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'theme-preference';

interface ThemeState {
  preference: ThemePreference;
  hydrate: () => Promise<void>;
  setPreference: (preference: ThemePreference) => Promise<void>;
}

function isThemePreference(value: string | null): value is 'light' | 'dark' {
  return value === 'light' || value === 'dark';
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'system',

  hydrate: async () => {
    const stored = await secureStorage.getItemAsync(THEME_STORAGE_KEY);
    const preference: ThemePreference = isThemePreference(stored) ? stored : 'system';
    colorScheme.set(preference);
    set({ preference });
  },

  setPreference: async (preference) => {
    colorScheme.set(preference);
    set({ preference });
    if (preference === 'system') {
      await secureStorage.deleteItemAsync(THEME_STORAGE_KEY);
    } else {
      await secureStorage.setItemAsync(THEME_STORAGE_KEY, preference);
    }
  },
}));
