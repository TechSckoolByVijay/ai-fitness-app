import '../global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApiError } from '../src/api/client';
import { useAuthStore } from '../src/state/authStore';
import { useThemeStore } from '../src/state/themeStore';

function shouldRetry(failureCount: number, error: unknown): boolean {
  // 4xx errors (bad request, unauthorized, not found, ...) won't fix
  // themselves on retry — only worth retrying transient network/5xx failures,
  // and only a couple of times.
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < 2;
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: shouldRetry },
          mutations: { retry: false },
        },
      }),
  );
  const hydrate = useAuthStore((s) => s.hydrate);
  const status = useAuthStore((s) => s.status);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    void hydrate();
    void hydrateTheme();
  }, [hydrate, hydrateTheme]);

  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-surface-dark">
        <ActivityIndicator size="large" color="#22b56d" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="log-meal"
            options={{ presentation: 'modal', headerShown: true, title: 'Log food or activity' }}
          />
          <Stack.Screen
            name="log-weight"
            options={{ presentation: 'modal', headerShown: true, title: 'Log weight' }}
          />
          <Stack.Screen
            name="log-sleep"
            options={{ presentation: 'modal', headerShown: true, title: 'Log sleep' }}
          />
          <Stack.Screen
            name="edit-body-info"
            options={{ presentation: 'modal', headerShown: true, title: 'Edit body info' }}
          />
          <Stack.Screen
            name="edit-goals"
            options={{ presentation: 'modal', headerShown: true, title: 'Edit goal' }}
          />
          <Stack.Screen
            name="edit-diet"
            options={{ presentation: 'modal', headerShown: true, title: 'Edit diet' }}
          />
          <Stack.Screen
            name="edit-allergies"
            options={{ presentation: 'modal', headerShown: true, title: 'Edit allergies' }}
          />
          <Stack.Screen
            name="edit-health-conditions"
            options={{ presentation: 'modal', headerShown: true, title: 'Edit health conditions' }}
          />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
